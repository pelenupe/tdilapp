const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// NUCLEAR RESET ENDPOINT - Manually wipe all demo data
router.post('/nuclear-reset', async (req, res) => {
  try {
    console.log('🔥 MANUAL NUCLEAR RESET TRIGGERED');
    
    // Simple brute force: delete everything
    const tables = [
      'audit_log', 'user_sessions', 'reward_redemptions', 
      'job_applications', 'event_attendees', 'points_history',
      'connections', 'messages', 'rewards', 'announcements', 
      'jobs', 'events', 'users'
    ];
    
    let deletedCount = 0;
    for (const table of tables) {
      try {
        const result = await query(`DELETE FROM ${table}`);
        console.log(`✅ Deleted all data from ${table}`);
        deletedCount++;
      } catch (e) {
        console.log(`⚠️ ${table} not found or already empty`);
      }
    }
    
    // Reset sequences
    const sequences = [
      'users_id_seq', 'events_id_seq', 'jobs_id_seq', 
      'rewards_id_seq', 'announcements_id_seq'
    ];
    
    for (const seq of sequences) {
      try {
        await query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
      } catch (e) {
        // Sequence doesn't exist, continue
      }
    }
    
    console.log(`💥 NUCLEAR RESET COMPLETE: Wiped ${deletedCount} tables`);
    
    res.json({
      success: true,
      message: `Nuclear reset complete - deleted data from ${deletedCount} tables`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Nuclear reset failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Check database status
router.get('/db-status', async (req, res) => {
  try {
    const result = await query('SELECT 1 as test');
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    const eventCount = await query('SELECT COUNT(*) as count FROM events');
    
    res.json({
      database: 'connected',
      users: parseInt(userCount[0]?.count || 0),
      events: parseInt(eventCount[0]?.count || 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
