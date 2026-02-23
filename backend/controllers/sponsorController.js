const { query } = require('../config/database');
const { normalizeTier, getTierPoints, distanceMeters } = require('../services/sponsorService');

const ensureAdmin = (req, res) => {
  if (req.user.userType !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return false;
  }
  return true;
};

const listSponsors = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const sponsors = await query(
      `SELECT id, name, tier, user_id, points_earned, is_active, created_at
       FROM sponsors
       ORDER BY name ASC`,
      []
    );

    for (const sponsor of sponsors) {
      const locations = await query(
        `SELECT id, sponsor_id, name, address, google_place_id, latitude, longitude, radius_meters, is_active
         FROM sponsor_locations
         WHERE sponsor_id = $1
         ORDER BY name ASC`,
        [sponsor.id]
      );
      sponsor.locations = locations;
    }

    res.json(sponsors);
  } catch (error) {
    console.error('List sponsors error:', error);
    res.status(500).json({ message: 'Error fetching sponsors' });
  }
};

const createSponsor = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { name, tier, userId, isActive = true } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Sponsor name is required' });
    }

    const normalizedTier = normalizeTier(tier);

    const rows = await query(
      `INSERT INTO sponsors (name, tier, user_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [name, normalizedTier, userId || null, Boolean(isActive)]
    );

    const sponsorId = rows[0]?.id;
    const created = await query('SELECT * FROM sponsors WHERE id = $1', [sponsorId]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Create sponsor error:', error);
    res.status(500).json({ message: 'Error creating sponsor' });
  }
};

const updateSponsor = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const sponsorId = req.params.id;
    const { name, tier, userId, isActive } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push(`name = $${params.length + 1}`);
      params.push(name);
    }
    if (tier !== undefined) {
      updates.push(`tier = $${params.length + 1}`);
      params.push(normalizeTier(tier));
    }
    if (userId !== undefined) {
      updates.push(`user_id = $${params.length + 1}`);
      params.push(userId || null);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${params.length + 1}`);
      params.push(Boolean(isActive));
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(sponsorId);

    await query(
      `UPDATE sponsors
       SET ${updates.join(', ')}
       WHERE id = $${params.length}`,
      params
    );

    const rows = await query('SELECT * FROM sponsors WHERE id = $1', [sponsorId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Update sponsor error:', error);
    res.status(500).json({ message: 'Error updating sponsor' });
  }
};

const createSponsorLocation = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const sponsorId = req.params.id;
    const {
      name,
      address,
      googlePlaceId,
      latitude,
      longitude,
      radiusMeters = 150,
      isActive = true
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Location name is required' });
    }

    const sponsorRows = await query('SELECT id FROM sponsors WHERE id = $1', [sponsorId]);
    if (!sponsorRows.length) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }

    const rows = await query(
      `INSERT INTO sponsor_locations (
        sponsor_id,
        name,
        address,
        google_place_id,
        latitude,
        longitude,
        radius_meters,
        is_active,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING id`,
      [
        sponsorId,
        name,
        address || null,
        googlePlaceId || null,
        latitude ?? null,
        longitude ?? null,
        Number(radiusMeters || 150),
        Boolean(isActive)
      ]
    );

    const locationId = rows[0]?.id;
    const created = await query('SELECT * FROM sponsor_locations WHERE id = $1', [locationId]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Create sponsor location error:', error);
    res.status(500).json({ message: 'Error creating sponsor location' });
  }
};

const getNearbySponsors = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);

    const rows = await query(
      `SELECT
         sl.id,
         sl.sponsor_id,
         sl.name AS location_name,
         sl.address,
         sl.google_place_id,
         sl.latitude,
         sl.longitude,
         sl.radius_meters,
         s.name AS sponsor_name,
         s.tier,
         s.user_id,
         s.points_earned,
         s.is_active
       FROM sponsor_locations sl
       JOIN sponsors s ON s.id = sl.sponsor_id
       WHERE sl.is_active = TRUE
         AND s.is_active = TRUE`,
      []
    );

    const withinRadius = rows
      .map((row) => {
        const meters = distanceMeters(latitude, longitude, Number(row.latitude), Number(row.longitude));
        const radius = Number(row.radius_meters || 150);
        if (meters === null || Number.isNaN(meters)) return null;
        if (meters > radius) return null;

        const tier = normalizeTier(row.tier);
        const points = getTierPoints(tier);
        return {
          sponsorId: row.sponsor_id,
          sponsorName: row.sponsor_name,
          tier,
          locationId: row.id,
          locationName: row.location_name,
          address: row.address,
          googlePlaceId: row.google_place_id,
          latitude: row.latitude,
          longitude: row.longitude,
          distanceMeters: Math.round(meters),
          radiusMeters: radius,
          bonusPoints: points.userBonus,
          sponsorPoints: points.sponsorPoints
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    res.json({
      count: withinRadius.length,
      sponsors: withinRadius
    });
  } catch (error) {
    console.error('Nearby sponsors error:', error);
    res.status(500).json({ message: 'Error fetching nearby sponsors' });
  }
};

module.exports = {
  listSponsors,
  createSponsor,
  updateSponsor,
  createSponsorLocation,
  getNearbySponsors
};
