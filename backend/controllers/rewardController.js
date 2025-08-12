const { query } = require('../config/database');

// Get all available rewards
const getRewards = async (req, res) => {
  try {
    const rewards = await query('SELECT * FROM rewards WHERE isActive = 1');
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
    db.get('SELECT * FROM rewards WHERE id = ? AND isActive = 1', [rewardId], (err, reward) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error fetching reward' });
      }

      if (!reward) {
        return res.status(404).json({ message: 'Reward not found' });
      }

      // Get user details
      db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error fetching user' });
        }

        if (user.points < reward.pointsCost) {
          return res.status(400).json({ message: 'Not enough points to redeem this reward.' });
        }

        // Deduct points from user
        const newPoints = user.points - reward.pointsCost;
        db.run('UPDATE users SET points = ? WHERE id = ?', [newPoints, req.user.id], (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error updating user points' });
          }

          // Record the redemption in points history
          db.run(
            'INSERT INTO points_history (userId, points, reason, type) VALUES (?, ?, ?, ?)',
            [req.user.id, -reward.pointsCost, `Redeemed: ${reward.title}`, 'redemption'],
            (err) => {
              if (err) {
                console.error('Error recording points history:', err);
              }
            }
          );

          res.json({ 
            message: `Successfully redeemed ${reward.title}!`,
            pointsRemaining: newPoints
          });
        });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error redeeming reward' });
  }
};

module.exports = { getRewards, redeemReward };
