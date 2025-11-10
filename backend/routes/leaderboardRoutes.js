const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// Get full leaderboard with timeframe filtering
router.get('/full', async (req, res) => {
  try {
    const { timeframe = 'all-time' } = req.query;
    
    let sql = `
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.jobTitle,
        u.company,
        u.profileImage,
        COALESCE(SUM(p.points), 0) as points,
        CAST(COALESCE(SUM(p.points), 0) / 1000 AS INTEGER) + 1 as level
      FROM users u
      LEFT JOIN points_history p ON u.id = p.userId
    `;
    
    // Add timeframe filtering
    if (timeframe === 'weekly') {
      sql += ` WHERE p.createdAt >= datetime('now', '-7 days') OR p.createdAt IS NULL`;
    } else if (timeframe === 'monthly') {
      sql += ` WHERE p.createdAt >= datetime('now', '-30 days') OR p.createdAt IS NULL`;
    }
    
    sql += `
      GROUP BY u.id
      ORDER BY points DESC, u.firstName ASC
      LIMIT 100
    `;
    
    const rows = await query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching full leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get top leaderboard (top 10)
router.get('/top', async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.jobTitle,
        u.company,
        u.profileImage,
        COALESCE(SUM(p.points), 0) as points,
        CAST(COALESCE(SUM(p.points), 0) / 1000 AS INTEGER) + 1 as level,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(p.points), 0) DESC) as rank
      FROM users u
      LEFT JOIN points_history p ON u.id = p.userId
      GROUP BY u.id
      ORDER BY points DESC, u.firstName ASC
      LIMIT 10
    `;
    
    const rows = await query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching top leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get basic leaderboard
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        COALESCE(SUM(p.points), 0) as points,
        CAST(COALESCE(SUM(p.points), 0) / 1000 AS INTEGER) + 1 as level
      FROM users u
      LEFT JOIN points_history p ON u.id = p.userId
      GROUP BY u.id
      ORDER BY points DESC, u.firstName ASC
      LIMIT 50
    `;
    
    const rows = await query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
