const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT * FROM events 
      ORDER BY date ASC
    `;
    
    const rows = await query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get upcoming events
router.get('/upcoming', async (req, res) => {
  try {
    const sql = `
      SELECT * FROM events 
      WHERE date >= datetime('now')
      ORDER BY date ASC
      LIMIT 3
    `;
    
    const rows = await query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching upcoming events:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

module.exports = router;
