const { query } = require('../config/database');

// Get all available rewards
const getRewards = async (req, res) => {
  try {
    const rewards = await query('SELECT id, title, description, pointscost, category, quantity, isactive, image_url FROM rewards WHERE isactive = $1', [true]);
    
    // Transform to camelCase for frontend
    const transformedRewards = rewards.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      pointsCost: r.pointscost,
      category: r.category,
      quantity: r.quantity,
      isActive: r.isactive,
      imageUrl: r.image_url
    }));
    
    res.json(transformedRewards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching rewards' });
  }
};

// Redeem a reward using points
const redeemReward = async (req, res) => {
  try {
    const { rewardId } = req.body;

    // Get reward details (use lowercase column names)
    const rewardResult = await query('SELECT id, title, description, pointscost, category, quantity, isactive FROM rewards WHERE id = $1 AND isactive = $2', [rewardId, true]);
    
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

    if (user.points < reward.pointscost) {
      return res.status(400).json({ message: 'Not enough points to redeem this reward.' });
    }

    // Deduct points from user
    const newPoints = user.points - reward.pointscost;
    await query('UPDATE users SET points = $1 WHERE id = $2', [newPoints, req.user.id]);

    // Record the redemption in points history (use lowercase column names)
    await query(
      'INSERT INTO points_history (userid, points, reason, type) VALUES ($1, $2, $3, $4)',
      [req.user.id, -reward.pointscost, `Redeemed: ${reward.title}`, 'redemption']
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
