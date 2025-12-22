const { query } = require('../config/database');

// Points configuration - easily adjustable by admins
const POINT_VALUES = {
  CONNECTION: 50,
  PROFILE_COMPLETE: 100,
  EVENT_ATTENDANCE: 75,
  JOB_APPLICATION: 25,
  COMMUNITY_POST: 20,
  PROFILE_VIEW: 5,
  LOGIN_STREAK: 15,
  REFERRAL: 100,
  REVIEW_SUBMITTED: 30
};

// Level thresholds
const LEVEL_THRESHOLDS = [
  { level: 1, minPoints: 0, name: 'Bronze', color: '#CD7F32' },
  { level: 2, minPoints: 500, name: 'Silver', color: '#C0C0C0' },
  { level: 3, minPoints: 1000, name: 'Gold', color: '#FFD700' },
  { level: 4, minPoints: 2500, name: 'Platinum', color: '#E5E4E2' },
  { level: 5, minPoints: 5000, name: 'Diamond', color: '#B9F2FF' },
  { level: 6, minPoints: 10000, name: 'Master', color: '#9932CC' }
];

// Award points to a user
const awardPoints = async (userId, pointType, description, metadata = {}) => {
  try {
    const points = POINT_VALUES[pointType] || 0;
    
    if (points <= 0) {
      throw new Error(`Invalid point type: ${pointType}`);
    }

    // Update user points
    await query(
      'UPDATE users SET points = points + $1 WHERE id = $2',
      [points, userId]
    );

    // Log the points activity
    await query(
      'INSERT INTO points_history (userId, points, type, reason) VALUES ($1, $2, $3, $4)',
      [userId, points, pointType, description]
    );

    // Get updated user data and recalculate level
    const users = await query('SELECT points FROM users WHERE id = $1', [userId]);
    const userPoints = users[0].points;
    const newLevel = calculateLevel(userPoints);

    // Update user level if changed
    await query('UPDATE users SET level = $1 WHERE id = $2', [newLevel.level, userId]);

    return {
      pointsAwarded: points,
      totalPoints: userPoints,
      level: newLevel,
      levelUp: false // TODO: Check if level increased
    };
  } catch (error) {
    console.error('Award points error:', error);
    throw error;
  }
};

// Calculate user level based on points
const calculateLevel = (points) => {
  let userLevel = LEVEL_THRESHOLDS[0];
  
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].minPoints) {
      userLevel = LEVEL_THRESHOLDS[i];
      break;
    }
  }
  
  return userLevel;
};

// Get user points and level info
const getUserPoints = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const users = await query(
      'SELECT points, level FROM users WHERE id = $1',
      [userId]
    );
    
    const user = users[0];
    const levelInfo = calculateLevel(user.points);
    const nextLevel = LEVEL_THRESHOLDS.find(l => l.level > levelInfo.level);
    
    res.json({
      points: user.points,
      level: levelInfo,
      nextLevel: nextLevel || null,
      pointsToNextLevel: nextLevel ? nextLevel.minPoints - user.points : 0
    });
  } catch (error) {
    console.error('Get user points error:', error);
    res.status(500).json({ message: 'Error fetching points' });
  }
};

// Get points history
const getPointsHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await query(
      'SELECT points, type, reason, createdAt FROM points_history WHERE userId = $1 ORDER BY createdAt DESC LIMIT $2',
      [userId, limit]
    );
    
    res.json(history);
  } catch (error) {
    console.error('Get points history error:', error);
    res.status(500).json({ message: 'Error fetching points history' });
  }
};

// Award points manually (admin endpoint)
const awardPointsManually = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { userId, points, reason } = req.body;
    
    if (!userId || !points || !reason) {
      return res.status(400).json({ message: 'userId, points, and reason are required' });
    }
    
    // Update user points directly
    await query(
      'UPDATE users SET points = points + $1 WHERE id = $2',
      [points, userId]
    );
    
    // Log the manual points award
    await query(
      'INSERT INTO points_history (userId, points, type, reason) VALUES ($1, $2, $3, $4)',
      [userId, points, 'MANUAL_AWARD', reason]
    );
    
    // Get updated user data
    const users = await query('SELECT points FROM users WHERE id = $1', [userId]);
    const userPoints = users[0].points;
    const newLevel = calculateLevel(userPoints);
    
    // Update user level
    await query('UPDATE users SET level = $1 WHERE id = $2', [newLevel.level, userId]);
    
    res.json({
      message: 'Points awarded successfully',
      pointsAwarded: points,
      totalPoints: userPoints,
      level: newLevel
    });
  } catch (error) {
    console.error('Manual points award error:', error);
    res.status(500).json({ message: 'Error awarding points' });
  }
};

// Get leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const leaderboard = await query(
      'SELECT id, firstName, lastName, points, level, profileImage FROM users WHERE userType = \'member\' ORDER BY points DESC LIMIT $1',
      [limit]
    );
    
    // Add level info and rank
    const leaderboardWithRanks = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1,
      levelInfo: calculateLevel(user.points)
    }));
    
    res.json(leaderboardWithRanks);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
};

// Get points configuration (admin endpoint)
const getPointsConfig = async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    res.json({
      pointValues: POINT_VALUES,
      levelThresholds: LEVEL_THRESHOLDS
    });
  } catch (error) {
    console.error('Get points config error:', error);
    res.status(500).json({ message: 'Error fetching configuration' });
  }
};

// Get points statistics (admin endpoint)
const getPointsStats = async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const stats = await query(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(points) as totalPointsAwarded,
        AVG(points) as avgPoints,
        MAX(points) as maxPoints,
        (SELECT COUNT(*) FROM points_history WHERE createdAt >= NOW() - INTERVAL '7 days') as pointsThisWeek,
        (SELECT COUNT(*) FROM points_history WHERE createdAt >= NOW() - INTERVAL '30 days') as pointsThisMonth
      FROM users WHERE userType = $1
    `, ['member']);
    
    const levelDistribution = await query(`
      SELECT level, COUNT(*) as count 
      FROM users 
      WHERE userType = $1 
      GROUP BY level 
      ORDER BY level
    `, ['member']);
    
    const activityBreakdown = await query(`
      SELECT type, COUNT(*) as count, SUM(points) as totalPoints
      FROM points_history 
      WHERE createdAt >= NOW() - INTERVAL '30 days'
      GROUP BY type 
      ORDER BY totalPoints DESC
    `);
    
    res.json({
      overview: stats[0],
      levelDistribution,
      activityBreakdown
    });
  } catch (error) {
    console.error('Points stats error:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
};

module.exports = {
  awardPoints,
  calculateLevel,
  getUserPoints,
  getPointsHistory,
  awardPointsManually,
  getLeaderboard,
  getPointsConfig,
  getPointsStats,
  POINT_VALUES,
  LEVEL_THRESHOLDS
};
