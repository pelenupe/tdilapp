const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/enhancedAuthMiddleware');
const {
  createCheckIn,
  getUserCheckIns,
  getCheckInStats
} = require('../controllers/checkInController');

// All routes require authentication
router.use(authenticateToken);

// Create a check-in
router.post('/', createCheckIn);

// Get user's check-in history
router.get('/', getUserCheckIns);

// Get user's check-in stats
router.get('/stats', getCheckInStats);

module.exports = router;
