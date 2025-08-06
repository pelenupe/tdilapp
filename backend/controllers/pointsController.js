const { Points, User } = require('../models');

// Award points for a specific action
const awardPoints = async (userId, action, amount) => {
  await Points.create({
    userId,
    amount,
    action
  });

  // Update user's points total
  const user = await User.findByPk(userId);
  if (user) {
    user.points += amount;

    // Simple leveling logic
    user.level = Math.floor(user.points / 500) + 1;

    await user.save();
  }
};

// Fetch a user's point history
const getPointHistory = async (req, res) => {
  try {
    const points = await Points.findAll({
      where: { userId: req.user.id }
    });
    res.json(points);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching points history' });
  }
};

// Fetch global leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const topUsers = await User.findAll({
      attributes: ['name', 'points', 'level'],
      order: [['points', 'DESC']],
      limit: 10
    });
    res.json(topUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
};

module.exports = { awardPoints, getPointHistory, getLeaderboard };
