const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// Detect database type for proper SQL syntax
const isPostgreSQL = () => {
  return process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres');
};

// Get full leaderboard with timeframe filtering
router.get('/full', async (req, res) => {
  try {
    const { timeframe = 'all-time' } = req.query;
    
    let sql = `
      SELECT 
        u.id,
        u.firstname as "firstName",
        u.lastname as "lastName",
        u.email,
        u.jobtitle as "jobTitle",
        u.company,
        u.profile_image as "profileImage",
        COALESCE(SUM(p.points), 0) as points,
        CAST(COALESCE(SUM(p.points), 0) / 1000 AS INTEGER) + 1 as level
      FROM users u
      LEFT JOIN points_history p ON u.id = p.userid
    `;
    
    // Add timeframe filtering with PostgreSQL syntax (we're in production)
    // Note: points_history uses 'createdat' (no underscore) column
    if (timeframe === 'weekly') {
      sql += ` WHERE p.createdat >= NOW() - INTERVAL '7 days' OR p.createdat IS NULL`;
    } else if (timeframe === 'monthly') {
      sql += ` WHERE p.createdat >= NOW() - INTERVAL '30 days' OR p.createdat IS NULL`;
    }
    
    sql += `
      GROUP BY u.id
      ORDER BY points DESC, u.firstname ASC
      LIMIT 100
    `;
    
    const rows = await query(sql);
    console.log('Full leaderboard response:', rows); // Debug logging
    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error('Error fetching full leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard', details: err.message });
  }
});

// Get top leaderboard (top 10)
router.get('/top', async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.firstname as "firstName",
        u.lastname as "lastName",
        u.email,
        u.jobtitle as "jobTitle",
        u.company,
        u.profile_image as "profileImage",
        COALESCE(SUM(p.points), 0) as points,
        CAST(COALESCE(SUM(p.points), 0) / 1000 AS INTEGER) + 1 as level,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(p.points), 0) DESC) as rank
      FROM users u
      LEFT JOIN points_history p ON u.id = p.userid
      GROUP BY u.id
      ORDER BY points DESC, u.firstname ASC
      LIMIT 10
    `;
    
    const rows = await query(sql);
    console.log('Top leaderboard response:', rows); // Debug logging
    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error('Error fetching top leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard', details: err.message });
  }
});

// Get basic leaderboard
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.firstname as "firstName",
        u.lastname as "lastName",
        u.email,
        COALESCE(SUM(p.points), 0) as points,
        CAST(COALESCE(SUM(p.points), 0) / 1000 AS INTEGER) + 1 as level
      FROM users u
      LEFT JOIN points_history p ON u.id = p.userid
      GROUP BY u.id
      ORDER BY points DESC, u.firstname ASC
      LIMIT 50
    `;
    
    const rows = await query(sql);
    console.log('Basic leaderboard response:', rows); // Debug logging
    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard', details: err.message });
  }
});

module.exports = router;
