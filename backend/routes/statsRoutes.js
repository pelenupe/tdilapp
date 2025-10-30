const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Get database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET /api/stats/overview - Get overview statistics
router.get('/overview', async (req, res) => {
  try {
    // Get total members count
    const membersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalMembers = parseInt(membersResult.rows[0].count) || 0;

    // Get total partners count (companies with members)
    const partnersResult = await pool.query(`
      SELECT COUNT(DISTINCT company) as count 
      FROM users 
      WHERE company IS NOT NULL AND company != ''
    `);
    const totalPartners = parseInt(partnersResult.rows[0].count) || 0;

    // Get total events count for this year
    const currentYear = new Date().getFullYear();
    const eventsResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM events 
      WHERE EXTRACT(YEAR FROM event_date) = $1
    `, [currentYear]);
    const totalEvents = parseInt(eventsResult.rows[0].count) || 0;

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
    const userTypeStats = await pool.query(`
      SELECT user_type, COUNT(*) as count
      FROM users 
      GROUP BY user_type
    `);

    // Get recent registrations (last 30 days)
    const recentRegistrations = await pool.query(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get top companies by member count
    const topCompanies = await pool.query(`
      SELECT company, COUNT(*) as member_count
      FROM users 
      WHERE company IS NOT NULL AND company != ''
      GROUP BY company
      ORDER BY member_count DESC
      LIMIT 10
    `);

    // Get event statistics
    const eventStats = await pool.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_date >= NOW() THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN event_date < NOW() THEN 1 END) as past_events
      FROM events
    `);

    res.json({
      userTypeStats: userTypeStats.rows,
      recentRegistrations: parseInt(recentRegistrations.rows[0].count) || 0,
      topCompanies: topCompanies.rows,
      eventStats: eventStats.rows[0],
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
