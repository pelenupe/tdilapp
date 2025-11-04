const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/enhancedAuthMiddleware');
const {
  getUserPoints,
  getPointsHistory,
  awardPointsManually,
  getLeaderboard,
  getPointsConfig,
  getPointsStats
} = require('../controllers/pointsController');

// All routes require authentication
router.use(authenticateToken);

// GET /api/points - Get current user's points and level
router.get('/', getUserPoints);

// GET /api/points/history - Get user's points history
router.get('/history', getPointsHistory);

// GET /api/points/leaderboard - Get global leaderboard
router.get('/leaderboard', getLeaderboard);

// POST /api/points/award - Award points manually (admin only)
router.post('/award', awardPointsManually);

// GET /api/points/config - Get points configuration (admin only)
router.get('/config', getPointsConfig);

// GET /api/points/stats - Get points statistics (admin only)  
router.get('/stats', getPointsStats);

module.exports = router;
