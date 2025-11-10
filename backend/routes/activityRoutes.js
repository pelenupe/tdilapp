const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// Get recent activity with real data from points_history and connections
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT 
        'points' as activityType,
        u.id as userId,
        u.firstName,
        u.lastName,
        u.profileImage,
        ph.points,
        ph.reason,
        ph.createdAt as timestamp,
        'earned ' || ph.points || ' points for ' || ph.reason as action
      FROM points_history ph
      JOIN users u ON ph.userId = u.id
      
      UNION ALL
      
      SELECT 
        'connection' as activityType,
        u.id as userId,
        u.firstName,
        u.lastName,
        u.profileImage,
        null as points,
        'Connected with ' || u2.firstName || ' ' || u2.lastName as reason,
        c.createdAt as timestamp,
        'connected with' as action
      FROM connections c
      JOIN users u ON c.userId = u.id
      JOIN users u2 ON c.connectedToId = u2.id
      
      ORDER BY timestamp DESC
      LIMIT 20
    `;
    
    const rows = await query(sql);
    
    // Format the activity data for frontend
    const formattedActivity = rows.map(row => ({
      user: `${row.firstName} ${row.lastName}`,
      userAvatar: row.profileImage || '/api/placeholder/32/32',
      action: row.action,
      target: row.reason,
      points: row.points,
      timestamp: row.timestamp,
      location: null // Can be enhanced later
    }));
    
    res.json(formattedActivity);
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get activity by type
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let sql;
    
    if (type === 'connections') {
      sql = `
        SELECT 
          u.id as userId,
          u.firstName,
          u.lastName,
          u.profileImage,
          'Connected with ' || u2.firstName || ' ' || u2.lastName as reason,
          c.createdAt as timestamp,
          'connected with' as action
        FROM connections c
        JOIN users u ON c.userId = u.id
        JOIN users u2 ON c.connectedToId = u2.id
        ORDER BY c.createdAt DESC
        LIMIT 20
      `;
    } else if (type === 'points') {
      sql = `
        SELECT 
          u.id as userId,
          u.firstName,
          u.lastName,
          u.profileImage,
          ph.points,
          ph.reason,
          ph.createdAt as timestamp,
          'earned ' || ph.points || ' points for ' || ph.reason as action
        FROM points_history ph
        JOIN users u ON ph.userId = u.id
        ORDER BY ph.createdAt DESC
        LIMIT 20
      `;
    } else {
      return res.status(400).json({ error: 'Invalid activity type' });
    }
    
    const rows = await query(sql);
    
    // Format the activity data
    const formattedActivity = rows.map(row => ({
      user: `${row.firstName} ${row.lastName}`,
      userAvatar: row.profileImage || '/api/placeholder/32/32',
      action: row.action,
      target: row.reason,
      points: row.points || null,
      timestamp: row.timestamp,
      location: null
    }));
    
    res.json(formattedActivity);
  } catch (err) {
    console.error(`Error fetching ${req.params.type} activity:`, err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

module.exports = router;
