const { query } = require('../config/database');

// Get all available rewards
const getRewards = async (req, res) => {
  try {
    const rewards = await query('SELECT * FROM rewards WHERE isActive = $1', [true]);
    res.json(rewards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching rewards' });
  }
};

// Redeem a reward using points
const redeemReward = async (req, res) => {
  try {
    const { rewardId } = req.body;

    // Get reward details
    const rewardResult = await query('SELECT * FROM rewards WHERE id = $1 AND isActive = $2', [rewardId, true]);
    
    if (rewardResult.length === 0) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    const reward = rewardResult[0];

    // Get user details
    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult[0];

    if (user.points < reward.pointsCost) {
      return res.status(400).json({ message: 'Not enough points to redeem this reward.' });
    }

    // Deduct points from user
    const newPoints = user.points - reward.pointsCost;
    await query('UPDATE users SET points = $1 WHERE id = $2', [newPoints, req.user.id]);

    // Record the redemption in points history
    await query(
      'INSERT INTO points_history (userId, points, reason, type) VALUES ($1, $2, $3, $4)',
      [req.user.id, -reward.pointsCost, `Redeemed: ${reward.title}`, 'redemption']
    );

    res.json({ 
      message: `Successfully redeemed ${reward.title}!`,
      pointsRemaining: newPoints
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error redeeming reward' });
  }
};

module.exports = { getRewards, redeemReward };
