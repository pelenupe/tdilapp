const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// Get recent activity — connections, checkins, points, chat
router.get('/', async (req, res) => {
  try {
    // 1) Recent check-ins with venue name
    const checkInActivity = await query(`
      SELECT
        'checkin' as activityType,
        u.id as userId,
        u.firstName,
        u.lastName,
        u.profileImage,
        0 as points,
        c.venue as target,
        c.created_at as timestamp,
        'checked in at' as action
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 20
    `).catch(() => []);

    // 2) Recent connections with real user names
    const connectionActivity = await query(`
      SELECT
        'connection' as activityType,
        u.id as userId,
        u.firstName,
        u.lastName,
        u.profileImage,
        null as points,
        u2.firstName || ' ' || u2.lastName as target,
        c.created_at as timestamp,
        'connected with' as action
      FROM connections c
      JOIN users u ON c.user_id = u.id
      JOIN users u2 ON c.connected_user_id = u2.id
      ORDER BY c.created_at DESC
      LIMIT 20
    `).catch(() => []);

    // 3) Chat activity (group messages — summary only, not content)
    const chatActivity = await query(`
      SELECT
        'chat' as activityType,
        u.id as userId,
        u.firstName,
        u.lastName,
        u.profileImage,
        null as points,
        gc.name as target,
        gm.created_at as timestamp,
        'sent a message in' as action
      FROM group_messages gm
      JOIN users u ON gm.user_id = u.id
      JOIN group_chats gc ON gm.chat_id = gc.id
      ORDER BY gm.created_at DESC
      LIMIT 20
    `).catch(() => []);

    // 4) Points / rewards activity (excluding connection/checkin duplicates)
    const pointsActivity = await query(`
      SELECT
        'points' as activityType,
        u.id as userId,
        u.firstName,
        u.lastName,
        u.profileImage,
        ph.points,
        ph.reason as target,
        ph.createdat as timestamp,
        'earned points' as action
      FROM points_history ph
      JOIN users u ON ph.userid = u.id
      WHERE ph.type NOT IN ('CHECKIN', 'CONNECTION', 'SPONSOR_CHECKIN_BONUS', 'SPONSOR_CHECKIN_CREDIT')
      ORDER BY ph.createdat DESC
      LIMIT 10
    `).catch(() => []);

    // Merge and sort all activity by timestamp desc, take top 30
    const all = [
      ...checkInActivity,
      ...connectionActivity,
      ...chatActivity,
      ...pointsActivity
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, 30);

    const formatted = all.map(row => ({
      activityType: row.activityType,
      userId: row.userId,
      user: `${row.firstName} ${row.lastName}`,
      userAvatar: row.profileImage || null,
      action: row.action,
      target: row.target,
      points: row.points || null,
      timestamp: row.timestamp,
      location: null
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    res.status(500).json({ error: 'Failed to fetch activity', details: err.message });
  }
});

// Get activity filtered by type
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let rows = [];

    if (type === 'connections') {
      rows = await query(`
        SELECT
          'connection' as activityType,
          u.id as userId,
          u.firstName,
          u.lastName,
          u.profileImage,
          null as points,
          u2.firstName || ' ' || u2.lastName as target,
          c.created_at as timestamp,
          'connected with' as action
        FROM connections c
        JOIN users u ON c.user_id = u.id
        JOIN users u2 ON c.connected_user_id = u2.id
        ORDER BY c.created_at DESC
        LIMIT 20
      `);
    } else if (type === 'checkins') {
      rows = await query(`
        SELECT
          'checkin' as activityType,
          u.id as userId,
          u.firstName,
          u.lastName,
          u.profileImage,
          0 as points,
          c.venue as target,
          c.created_at as timestamp,
          'checked in at' as action
        FROM checkins c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
        LIMIT 20
      `);
    } else if (type === 'chats') {
      rows = await query(`
        SELECT
          'chat' as activityType,
          u.id as userId,
          u.firstName,
          u.lastName,
          u.profileImage,
          null as points,
          gc.name as target,
          gm.created_at as timestamp,
          'sent a message in' as action
        FROM group_messages gm
        JOIN users u ON gm.user_id = u.id
        JOIN group_chats gc ON gm.chat_id = gc.id
        ORDER BY gm.created_at DESC
        LIMIT 20
      `).catch(() => []);
    } else if (type === 'points') {
      rows = await query(`
        SELECT
          'points' as activityType,
          u.id as userId,
          u.firstName,
          u.lastName,
          u.profileImage,
          ph.points,
          ph.reason as target,
          ph.createdat as timestamp,
          'earned points' as action
        FROM points_history ph
        JOIN users u ON ph.userid = u.id
        ORDER BY ph.createdat DESC
        LIMIT 20
      `).catch(() => []);
    } else {
      return res.status(400).json({ error: 'Invalid activity type. Use: connections, checkins, chats, points' });
    }

    const formatted = rows.map(row => ({
      activityType: row.activityType,
      userId: row.userId,
      user: `${row.firstName} ${row.lastName}`,
      userAvatar: row.profileImage || null,
      action: row.action,
      target: row.target,
      points: row.points || null,
      timestamp: row.timestamp,
      location: null
    }));

    res.json(formatted);
  } catch (err) {
    console.error(`Error fetching ${req.params.type} activity:`, err);
    res.status(500).json({ error: 'Failed to fetch activity', details: err.message });
  }
});

module.exports = router;
