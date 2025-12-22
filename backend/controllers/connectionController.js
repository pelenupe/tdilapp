const { query } = require('../config/database');
const { awardPoints } = require('./pointsController');

// Create a connection between two users
const createConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    if (userId === targetUserId) {
      return res.status(400).json({ message: 'Cannot connect to yourself' });
    }

    // Check if connection already exists
    const existingConnection = await query(
      'SELECT id FROM connections WHERE (user_id = $1 AND connected_user_id = $2) OR (user_id = $3 AND connected_user_id = $4)',
      [userId, targetUserId, targetUserId, userId]
    );

    if (existingConnection.length > 0) {
      return res.status(400).json({ message: 'Connection already exists' });
    }

    // Create the connection
    await query(
      'INSERT INTO connections (user_id, connected_user_id, status, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, targetUserId, 'connected']
    );

    // Award points to both users using the points system
    const userPointsResult = await awardPoints(userId, 'CONNECTION', `Connected with user ${targetUserId}`, { targetUserId });
    const targetPointsResult = await awardPoints(targetUserId, 'CONNECTION', `Connected with user ${userId}`, { userId });

    // Get updated user data
    const users = await query(
      'SELECT id, firstName, lastName, points, level FROM users WHERE id = $1 OR id = $2',
      [userId, targetUserId]
    );

    res.json({ 
      message: 'Connection created successfully',
      pointsAwarded: userPointsResult.pointsAwarded,
      users: users,
      userLevel: userPointsResult.level,
      targetLevel: targetPointsResult.level
    });
  } catch (error) {
    console.error('Connection error:', error);
    res.status(500).json({ message: 'Error creating connection' });
  }
};

// Get user connections
const getUserConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const connections = await query(
      `SELECT 
        c.id as connection_id,
        c.created_at,
        u.id,
        u.firstName,
        u.lastName,
        u.company,
        u.jobTitle,
        u.points,
        u.level,
        u.profileImage
      FROM connections c
      JOIN users u ON (
        CASE 
          WHEN c.user_id = $1 THEN u.id = c.connected_user_id
          ELSE u.id = c.user_id
        END
      )
      WHERE (c.user_id = $2 OR c.connected_user_id = $3)
      AND c.status = 'connected'
      ORDER BY c.created_at DESC`,
      [userId, userId, userId]
    );

    res.json(connections);
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ message: 'Error fetching connections' });
  }
};

// Get connection stats
const getConnectionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await query(
      'SELECT COUNT(*) as connectionCount FROM connections WHERE (user_id = $1 OR connected_user_id = $2) AND status = \'connected\'',
      [userId, userId]
    );

    res.json({ connectionCount: stats[0].connectionCount });
  } catch (error) {
    console.error('Connection stats error:', error);
    res.status(500).json({ message: 'Error fetching connection stats' });
  }
};

module.exports = {
  createConnection,
  getUserConnections,
  getConnectionStats
};
