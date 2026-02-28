const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/enhancedAuthMiddleware');
const { query, isPostgreSQL } = require('../config/database');
const { normalizeTier, getTierPoints } = require('../services/sponsorService');

// Proxy for Google Geocoding — keeps API key server-side
router.get('/geocode', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD4G3-ju-WsDBCbPjOUo4X_qzKhphs3KZc';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    const address = data.results?.[0]?.formatted_address || `${lat}, ${lng}`;
    res.json({ address });
  } catch (err) {
    console.error('Geocode error:', err);
    res.json({ address: `${req.query.lat}, ${req.query.lng}` });
  }
});

// Proxy for Google Places API to avoid CORS
router.get('/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, radius = 1500 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD4G3-ju-WsDBCbPjOUo4X_qzKhphs3KZc';
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=establishment&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    // Enrich places with sponsor metadata — wrapped in try/catch so DB issues
    // never block the Google Places results from being returned.
    const places = Array.isArray(data.results) ? data.results : [];

    try {
      const placeIds = places.map((p) => p.place_id).filter(Boolean);

      if (placeIds.length > 0) {
        const placeholders = placeIds.map((_, i) => isPostgreSQL ? `$${i + 1}` : '?').join(',');
        const mapped = await query(
          `SELECT
             sl.google_place_id,
             sl.id AS sponsor_location_id,
             sl.name AS sponsor_location_name,
             s.id AS sponsor_id,
             s.name AS sponsor_name,
             s.tier
           FROM sponsor_locations sl
           JOIN sponsors s ON s.id = sl.sponsor_id
           WHERE sl.google_place_id IN (${placeholders})
             AND (sl.is_active = TRUE OR sl.is_active = 1)
             AND (s.is_active = TRUE OR s.is_active = 1)`,
          placeIds
        );

        const byPlaceId = new Map();
        for (const row of mapped) {
          const tier = normalizeTier(row.tier);
          byPlaceId.set(row.google_place_id, {
            sponsorId: row.sponsor_id,
            sponsorName: row.sponsor_name,
            tier,
            sponsorLocationId: row.sponsor_location_id,
            sponsorLocationName: row.sponsor_location_name,
            ...getTierPoints(tier)
          });
        }

        data.results = places.map((place) => ({
          ...place,
          sponsor: place.place_id ? byPlaceId.get(place.place_id) || null : null
        }));
      }
    } catch (sponsorErr) {
      // Sponsor lookup is non-fatal — still return Google Places results
      console.warn('Sponsor enrichment skipped (non-fatal):', sponsorErr.message);
      // Ensure results are still set (no sponsor data, but places show)
      data.results = places.map((place) => ({ ...place, sponsor: null }));
    }

    res.json(data);
  } catch (error) {
    console.error('Places API error:', error);
    res.status(500).json({ message: 'Error fetching nearby places' });
  }
});

module.exports = router;
