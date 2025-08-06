const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// Get all events
router.get('/', (req, res) => {
  const query = `
    SELECT * FROM events 
    ORDER BY date ASC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching events:', err);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
    res.json(rows);
  });
});

// Get upcoming events
router.get('/upcoming', (req, res) => {
  const query = `
    SELECT * FROM events 
    WHERE date >= datetime('now')
    ORDER BY date ASC
    LIMIT 3
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching upcoming events:', err);
      return res.status(500).json({ error: 'Failed to fetch upcoming events' });
    }
    res.json(rows);
  });
});

module.exports = router;
