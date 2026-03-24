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
    
    // Use points directly from users table for all-time, calculate from history for timeframes
    if (timeframe === 'all-time') {
      const sql = `
        SELECT
          id,
          slug,
          userType,
          "firstName",
          "lastName",
          email,
          "jobTitle",
          company,
          "profileImage",
          partner_school_name,
          partner_school_status,
          COALESCE(points, 0) as points,
          COALESCE(level, 1) as level
        FROM users
        ORDER BY points DESC, "firstName" ASC
        LIMIT 100
      `;
      
      const rows = await query(sql);
      res.json(Array.isArray(rows) ? rows : []);
    } else {
      // For weekly/monthly, calculate from points_history
      let sql = `
        SELECT 
          u.id,
          u.slug,
          u.userType,
          u."firstName",
          u."lastName",
          u.email,
          u."jobTitle",
          u.company,
          u."profileImage",
          u.partner_school_name,
          u.partner_school_status,
          COALESCE(SUM(p.points), 0) as points,
          CAST(COALESCE(SUM(p.points), 0) / 1000 AS INTEGER) + 1 as level
        FROM users u
        LEFT JOIN points_history p ON u.id = p.userid
      `;
      
      if (timeframe === 'weekly') {
        sql += ` WHERE p.createdat >= NOW() - INTERVAL '7 days' OR p.createdat IS NULL`;
      } else if (timeframe === 'monthly') {
        sql += ` WHERE p.createdat >= NOW() - INTERVAL '30 days' OR p.createdat IS NULL`;
      }
      
      sql += `
        GROUP BY u.id, u.slug, u.userType, u."firstName", u."lastName", u.email, u."jobTitle", u.company, u."profileImage", u.partner_school_name, u.partner_school_status
        ORDER BY points DESC, u."firstName" ASC
        LIMIT 100
      `;
      
      const rows = await query(sql);
      res.json(Array.isArray(rows) ? rows : []);
    }
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
        u.slug,
        u.userType,
        u.firstName as "firstName",
        u.lastName as "lastName",
        u.email,
        u.jobTitle as "jobTitle",
        u.company,
        u.profileImage as "profileImage",
        u.partner_school_name,
        u.partner_school_status,
        COALESCE(SUM(p.points), 0) as points,
        CAST(COALESCE(SUM(p.points), 0) / 1000 AS INTEGER) + 1 as level,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(p.points), 0) DESC) as rank
      FROM users u
      LEFT JOIN points_history p ON u.id = p.userid
      GROUP BY u.id, u.slug, u.userType, u.partner_school_name, u.partner_school_status
      ORDER BY points DESC, u.firstName ASC
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
        u.slug,
        u.userType,
        u.firstName as "firstName",
        u.lastName as "lastName",
        u.email,
        u.partner_school_name,
        u.partner_school_status,
        COALESCE(SUM(p.points), 0) as points,
        CAST(COALESCE(SUM(p.points), 0) / 1000 AS INTEGER) + 1 as level
      FROM users u
      LEFT JOIN points_history p ON u.id = p.userid
      GROUP BY u.id, u.slug, u.userType, u.partner_school_name, u.partner_school_status
      ORDER BY points DESC, u.firstName ASC
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
