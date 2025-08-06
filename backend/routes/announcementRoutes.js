const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// Get all announcements
router.get('/', (req, res) => {
  const query = `
    SELECT * FROM announcements 
    ORDER BY featured DESC, createdAt DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching announcements:', err);
      return res.status(500).json({ error: 'Failed to fetch announcements' });
    }
    res.json(rows);
  });
});

// Get featured announcements
router.get('/featured', (req, res) => {
  const query = `
    SELECT * FROM announcements 
    WHERE featured = 1
    ORDER BY createdAt DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching featured announcements:', err);
      return res.status(500).json({ error: 'Failed to fetch featured announcements' });
    }
    res.json(rows);
  });
});

module.exports = router;
