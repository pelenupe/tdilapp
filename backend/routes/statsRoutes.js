const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// GET /api/stats/overview - Get overview statistics
router.get('/overview', async (req, res) => {
  try {
    // Get total members count
    const membersResult = await query('SELECT COUNT(*) as count FROM users');
    const totalMembers = parseInt(membersResult[0].count || membersResult[0]['COUNT(*)']) || 0;

    // Get total partners count (companies with members)
    const partnersResult = await query(`
      SELECT COUNT(DISTINCT company) as count 
      FROM users 
      WHERE company IS NOT NULL AND company != ''
    `);
    const totalPartners = parseInt(partnersResult[0].count || partnersResult[0]['COUNT(DISTINCT company)']) || 0;

    // Get total events count for this year
    const currentYear = new Date().getFullYear();
    const eventsResult = await query(`
      SELECT COUNT(*) as count 
      FROM events 
      WHERE EXTRACT(YEAR FROM date) = $1
    `, [currentYear]);
    const totalEvents = parseInt(eventsResult[0].count || eventsResult[0]['COUNT(*)']) || 0;

    res.json({
      totalMembers,
      totalPartners,
      totalEvents,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching stats overview:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

// GET /api/stats/detailed - Get detailed statistics (protected)
router.get('/detailed', async (req, res) => {
  try {
    // Get member statistics by user type
    const userTypeStats = await query(`
      SELECT userType, COUNT(*) as count
      FROM users 
      GROUP BY userType
    `);

    // Get recent registrations (last 30 days)
    const recentRegistrations = await query(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE createdAt >= datetime('now', '-30 days')
    `);

    // Get top companies by member count
    const topCompanies = await query(`
      SELECT company, COUNT(*) as member_count
      FROM users 
      WHERE company IS NOT NULL AND company != ''
      GROUP BY company
      ORDER BY member_count DESC
      LIMIT 10
    `);

    // Get event statistics
    const eventStats = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN date >= datetime('now') THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN date < datetime('now') THEN 1 END) as past_events
      FROM events
    `);

    res.json({
      userTypeStats: userTypeStats,
      recentRegistrations: parseInt(recentRegistrations[0].count || recentRegistrations[0]['COUNT(*)']) || 0,
      topCompanies: topCompanies,
      eventStats: eventStats[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching detailed stats:', error);
    res.status(500).json({
      error: 'Failed to fetch detailed statistics',
      message: error.message
    });
  }
});

module.exports = router;
