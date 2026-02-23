const { query } = require('../config/database');
const { awardPoints } = require('./pointsController');
const { getTierPoints, distanceMeters } = require('../services/sponsorService');

const normalizeLocationRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    sponsorId: row.sponsor_id ?? row.sponsorId,
    name: row.name,
    address: row.address,
    googlePlaceId: row.google_place_id ?? row.googlePlaceId,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radius_meters ?? row.radiusMeters
  };
};

const normalizeSponsorRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    userId: row.user_id ?? row.userId,
    pointsEarned: row.points_earned ?? row.pointsEarned,
    isActive: row.is_active ?? row.isActive
  };
};

const findSponsorByPlaceId = async (googlePlaceId) => {
  if (!googlePlaceId) return null;

  const matches = await query(
    `SELECT
       sl.id,
       sl.sponsor_id,
       sl.name,
       sl.address,
       sl.google_place_id,
       sl.latitude,
       sl.longitude,
       sl.radius_meters,
       s.id AS sponsor_id_ref,
       s.name AS sponsor_name,
       s.tier,
       s.user_id,
       s.points_earned,
       s.is_active
     FROM sponsor_locations sl
     JOIN sponsors s ON s.id = sl.sponsor_id
     WHERE sl.google_place_id = $1
       AND sl.is_active = TRUE
       AND s.is_active = TRUE
     LIMIT 1`,
    [googlePlaceId]
  );

  if (!matches.length) return null;

  const row = matches[0];
  return {
    sponsor: normalizeSponsorRow({
      id: row.sponsor_id_ref,
      name: row.sponsor_name,
      tier: row.tier,
      user_id: row.user_id,
      points_earned: row.points_earned,
      is_active: row.is_active
    }),
    location: normalizeLocationRow(row),
    validationMethod: 'place_id'
  };
};

const findSponsorByDistance = async (latitude, longitude) => {
  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
    return null;
  }

  const nearby = await query(
    `SELECT
       sl.id,
       sl.sponsor_id,
       sl.name,
       sl.address,
       sl.google_place_id,
       sl.latitude,
       sl.longitude,
       sl.radius_meters,
       s.id AS sponsor_id_ref,
       s.name AS sponsor_name,
       s.tier,
       s.user_id,
       s.points_earned,
       s.is_active
     FROM sponsor_locations sl
     JOIN sponsors s ON s.id = sl.sponsor_id
     WHERE sl.is_active = TRUE
       AND s.is_active = TRUE
       AND sl.latitude IS NOT NULL
       AND sl.longitude IS NOT NULL`,
    []
  );

  let bestMatch = null;
  for (const row of nearby) {
    const distance = distanceMeters(
      Number(latitude),
      Number(longitude),
      Number(row.latitude),
      Number(row.longitude)
    );

    const radiusMeters = Number(row.radius_meters || 150);
    if (distance !== null && distance <= radiusMeters) {
      if (!bestMatch || distance < bestMatch.distanceMeters) {
        bestMatch = {
          sponsor: normalizeSponsorRow({
            id: row.sponsor_id_ref,
            name: row.sponsor_name,
            tier: row.tier,
            user_id: row.user_id,
            points_earned: row.points_earned,
            is_active: row.is_active
          }),
          location: normalizeLocationRow(row),
          validationMethod: 'distance',
          distanceMeters: Math.round(distance)
        };
      }
    }
  }

  return bestMatch;
};

const resolveSponsorMatch = async ({ googlePlaceId, latitude, longitude }) => {
  const placeIdMatch = await findSponsorByPlaceId(googlePlaceId);
  if (placeIdMatch) return placeIdMatch;
  return findSponsorByDistance(latitude, longitude);
};

const awardSponsorPoints = async (sponsor, sponsorPoints, venue, userId, checkInId) => {
  if (!sponsor || sponsorPoints <= 0) return;

  await query(
    'UPDATE sponsors SET points_earned = COALESCE(points_earned, 0) + $1 WHERE id = $2',
    [sponsorPoints, sponsor.id]
  );

  if (sponsor.userId) {
    await awardPoints(
      sponsor.userId,
      'SPONSOR_CHECKIN_CREDIT',
      `Sponsor reward from check-in at ${venue} by user ${userId}`,
      { sponsorId: sponsor.id, checkInId, pointsOverride: sponsorPoints }
    );
  }
};

const insertSponsorLedger = async ({
  checkInId,
  sponsor,
  sponsorLocation,
  userId,
  tier,
  userBonusPoints,
  sponsorPointsAwarded,
  validationMethod
}) => {
  await query(
    `INSERT INTO sponsor_checkins (
      checkin_id,
      sponsor_id,
      sponsor_location_id,
      user_id,
      tier,
      user_bonus_points,
      sponsor_points_awarded,
      validation_method,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
    [
      checkInId,
      sponsor.id,
      sponsorLocation?.id || null,
      userId,
      tier,
      userBonusPoints,
      sponsorPointsAwarded,
      validationMethod || 'place_id'
    ]
  );
};

// Create a check-in
const createCheckIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      location,
      venue,
      notes,
      taggedUserIds,
      latitude,
      longitude,
      googlePlaceId
    } = req.body;

    if (!location || !venue) {
      return res.status(400).json({ message: 'Location and venue are required' });
    }

    const sponsorMatch = await resolveSponsorMatch({
      googlePlaceId,
      latitude,
      longitude
    });

    let sponsorBonusPoints = 0;
    let sponsorPointsAwarded = 0;
    let sponsorTier = null;

    if (sponsorMatch?.sponsor) {
      const tierPoints = getTierPoints(sponsorMatch.sponsor.tier);
      sponsorBonusPoints = tierPoints.userBonus;
      sponsorPointsAwarded = tierPoints.sponsorPoints;
      sponsorTier = tierPoints.tier;
    }

    // Create the check-in record
    const result = await query(
      `INSERT INTO checkins (
         user_id,
         location,
         venue,
         notes,
         latitude,
         longitude,
         google_place_id,
         sponsor_id,
         sponsor_location_id,
         points_awarded,
         sponsor_bonus_points,
         created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        userId,
        location,
        venue,
        notes || '',
        latitude ?? null,
        longitude ?? null,
        googlePlaceId || null,
        sponsorMatch?.sponsor?.id || null,
        sponsorMatch?.location?.id || null,
        0,
        sponsorBonusPoints
      ]
    );

    const checkInId = result[0].id;

    // Tag users if provided
    if (taggedUserIds && Array.isArray(taggedUserIds) && taggedUserIds.length > 0) {
      for (const taggedUserId of taggedUserIds) {
        await query(
          `INSERT INTO checkin_tagged_users (checkin_id, user_id) VALUES ($1, $2)`,
          [checkInId, taggedUserId]
        );
      }
    }

    const basePointsResult = await awardPoints(
      userId,
      'CHECKIN',
      `Checked in at ${venue}`,
      { location, venue, checkInId }
    );

    let finalPointsTotal = basePointsResult.totalPoints;

    if (sponsorBonusPoints > 0) {
      const bonusResult = await awardPoints(
        userId,
        'SPONSOR_CHECKIN_BONUS',
        `Sponsor ${sponsorTier} bonus at ${venue}`,
        {
          venue,
          checkInId,
          sponsorId: sponsorMatch.sponsor.id,
          sponsorTier,
          googlePlaceId: googlePlaceId || null,
          pointsOverride: sponsorBonusPoints
        }
      );
      finalPointsTotal = bonusResult.totalPoints;
    }

    const totalPointsAwarded = basePointsResult.pointsAwarded + sponsorBonusPoints;

    await query(
      'UPDATE checkins SET points_awarded = $1 WHERE id = $2',
      [totalPointsAwarded, checkInId]
    );

    if (sponsorMatch?.sponsor) {
      await awardSponsorPoints(
        sponsorMatch.sponsor,
        sponsorPointsAwarded,
        venue,
        userId,
        checkInId
      );

      await insertSponsorLedger({
        checkInId,
        sponsor: sponsorMatch.sponsor,
        sponsorLocation: sponsorMatch.location,
        userId,
        tier: sponsorTier,
        userBonusPoints: sponsorBonusPoints,
        sponsorPointsAwarded,
        validationMethod: sponsorMatch.validationMethod
      });
    }

    const totalPoints = finalPointsTotal;

    res.json({
      message: 'Check-in successful',
      checkInId,
      pointsAwarded: totalPointsAwarded,
      basePointsAwarded: basePointsResult.pointsAwarded,
      sponsorBonusPoints,
      sponsorPointsAwarded,
      totalPoints,
      level: basePointsResult.level,
      taggedCount: taggedUserIds?.length || 0,
      sponsor: sponsorMatch?.sponsor
        ? {
            id: sponsorMatch.sponsor.id,
            name: sponsorMatch.sponsor.name,
            tier: sponsorTier,
            validationMethod: sponsorMatch.validationMethod,
            locationName: sponsorMatch.location?.name || null
          }
        : null
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Error creating check-in' });
  }
};

// Get user's check-in history
const getUserCheckIns = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const checkIns = await query(
      `SELECT
         c.id,
         c.location,
         c.venue,
         c.notes,
         c.created_at,
         c.points_awarded,
         c.sponsor_bonus_points,
         c.google_place_id,
         c.latitude,
         c.longitude,
         s.id AS sponsor_id,
         s.name AS sponsor_name,
         s.tier AS sponsor_tier,
         sl.name AS sponsor_location_name,
         sc.validation_method
       FROM checkins c
       LEFT JOIN sponsors s ON c.sponsor_id = s.id
       LEFT JOIN sponsor_locations sl ON c.sponsor_location_id = sl.id
       LEFT JOIN sponsor_checkins sc ON sc.checkin_id = c.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    // Get tagged users for each check-in
    for (let checkIn of checkIns) {
      const tagged = await query(
        `SELECT u.id, u.firstName, u.lastName 
         FROM checkin_tagged_users ct
         JOIN users u ON ct.user_id = u.id
         WHERE ct.checkin_id = $1`,
        [checkIn.id]
      );
      checkIn.taggedUsers = tagged;
      checkIn.sponsor = checkIn.sponsor_id
        ? {
            id: checkIn.sponsor_id,
            name: checkIn.sponsor_name,
            tier: checkIn.sponsor_tier,
            locationName: checkIn.sponsor_location_name,
            validationMethod: checkIn.validation_method || 'place_id'
          }
        : null;
    }

    res.json(checkIns);
  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({ message: 'Error fetching check-ins' });
  }
};

// Get check-in stats
const getCheckInStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await query(
      'SELECT COUNT(*) as total FROM checkins WHERE user_id = $1',
      [userId]
    );

    res.json({ totalCheckIns: parseInt(stats[0].total) || 0 });
  } catch (error) {
    console.error('Check-in stats error:', error);
    res.status(500).json({ message: 'Error fetching check-in stats' });
  }
};

module.exports = {
  createCheckIn,
  getUserCheckIns,
  getCheckInStats
};
