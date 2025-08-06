const express = require('express');
const { getPointHistory, getLeaderboard } = require('../controllers/pointsController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Fetch current user's points
router.get('/history', protect, getPointHistory);

// Fetch global leaderboard
router.get('/leaderboard', protect, getLeaderboard);

module.exports = router;
