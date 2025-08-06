const express = require('express');
const { getRewards, redeemReward } = require('../controllers/rewardController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Get list of rewards
router.get('/', protect, getRewards);

// Redeem a reward
router.post('/redeem', protect, redeemReward);

module.exports = router;
