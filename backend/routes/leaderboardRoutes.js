const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// Get leaderboard - NO MORE DEMO DATA!
router.get('/', (req, res) => {
  // Return empty leaderboard for production - no fake users
  res.json([]);
});

// Get top leaderboard (top 10) - NO MORE DEMO DATA!
router.get('/top', (req, res) => {
  // Return empty leaderboard for production - no fake users
  res.json([]);
});

module.exports = router;
