const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// Get all announcements
router.get('/', async (req, res) => {
  try {
    const announcements = await query(`
      SELECT * FROM announcements 
      ORDER BY featured DESC, createdat DESC
    `);
    res.json(announcements || []);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    // Return empty array if table doesn't exist
    if (err.code === '42P01') {
      return res.json([]);
    }
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Get featured announcements
router.get('/featured', async (req, res) => {
  try {
    const announcements = await query(`
      SELECT * FROM announcements 
      WHERE featured = $1
      ORDER BY createdat DESC
    `, [true]);
    res.json(announcements || []);
  } catch (err) {
    console.error('Error fetching featured announcements:', err);
    // Return empty array if table doesn't exist
    if (err.code === '42P01') {
      return res.json([]);
    }
    res.status(500).json({ error: 'Failed to fetch featured announcements' });
  }
});

module.exports = router;
