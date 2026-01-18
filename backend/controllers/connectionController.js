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

    // Get updated user data (use lowercase column names for PostgreSQL)
    const usersData = await query(
      'SELECT id, firstname, lastname, points, level FROM users WHERE id = $1 OR id = $2',
      [userId, targetUserId]
    );
    
    // Transform to camelCase for frontend
    const users = usersData.map(u => ({
      id: u.id,
      firstName: u.firstname,
      lastName: u.lastname,
      points: u.points,
      level: u.level
    }));

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

    const connectionsData = await query(
      `SELECT 
        c.id as connection_id,
        c.created_at,
        u.id,
        u.firstname,
        u.lastname,
        u.company,
        u.jobtitle,
        u.points,
        u.level,
        u.profile_image
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

    // Transform to camelCase for frontend
    const connections = connectionsData.map(c => ({
      connectionId: c.connection_id,
      createdAt: c.created_at,
      id: c.id,
      firstName: c.firstname,
      lastName: c.lastname,
      company: c.company,
      jobTitle: c.jobtitle,
      points: c.points,
      level: c.level,
      profileImage: c.profile_image
    }));

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
      'SELECT COUNT(*) as connection_count FROM connections WHERE (user_id = $1 OR connected_user_id = $2) AND status = \'connected\'',
      [userId, userId]
    );

    // PostgreSQL returns lowercase column names
    res.json({ connectionCount: parseInt(stats[0].connection_count) || 0 });
  } catch (error) {
    console.error('Connection stats error:', error);
    res.status(500).json({ message: 'Error fetching connection stats' });
  }
};

// Check connection status with a specific user
const checkConnectionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;

    const connection = await query(
      'SELECT id, status FROM connections WHERE (user_id = $1 AND connected_user_id = $2) OR (user_id = $3 AND connected_user_id = $4)',
      [userId, targetUserId, targetUserId, userId]
    );

    if (connection.length > 0) {
      res.json({ connected: true, connectionId: connection[0].id, status: connection[0].status });
    } else {
      res.json({ connected: false });
    }
  } catch (error) {
    console.error('Check connection error:', error);
    res.status(500).json({ message: 'Error checking connection status' });
  }
};

// Get connection status for multiple users (batch)
const getConnectionStatuses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'userIds array is required' });
    }

    const connections = await query(
      `SELECT 
        CASE WHEN user_id = $1 THEN connected_user_id ELSE user_id END as connected_to,
        id as connection_id,
        status
       FROM connections 
       WHERE (user_id = $1 OR connected_user_id = $2)
       AND status = 'connected'`,
      [userId, userId]
    );

    // Create a map of connected user IDs
    const connectedMap = {};
    connections.forEach(c => {
      connectedMap[c.connected_to] = { connectionId: c.connection_id, status: c.status };
    });

    res.json(connectedMap);
  } catch (error) {
    console.error('Get connection statuses error:', error);
    res.status(500).json({ message: 'Error fetching connection statuses' });
  }
};

// Disconnect from a user
const removeConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;

    // Check if connection exists
    const connection = await query(
      'SELECT id FROM connections WHERE (user_id = $1 AND connected_user_id = $2) OR (user_id = $3 AND connected_user_id = $4)',
      [userId, targetUserId, targetUserId, userId]
    );

    if (connection.length === 0) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    // Delete the connection
    await query(
      'DELETE FROM connections WHERE (user_id = $1 AND connected_user_id = $2) OR (user_id = $3 AND connected_user_id = $4)',
      [userId, targetUserId, targetUserId, userId]
    );

    res.json({ message: 'Connection removed successfully' });
  } catch (error) {
    console.error('Remove connection error:', error);
    res.status(500).json({ message: 'Error removing connection' });
  }
};

module.exports = {
  createConnection,
  getUserConnections,
  getConnectionStats,
  checkConnectionStatus,
  getConnectionStatuses,
  removeConnection
};
