const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// Get recent activity - NO MORE DEMO DATA!
router.get('/', (req, res) => {
  // Return empty activity for production - no fake activity
  res.json([]);
});

// Get activity by type - NO MORE DEMO DATA!
router.get('/:type', (req, res) => {
  // Return empty activity for production - no fake activity
  res.json([]);
});

module.exports = router;
