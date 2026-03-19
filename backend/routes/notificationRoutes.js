const express = require('express');
const { query, isPostgreSQL } = require('../config/database');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

const p = (n) => isPostgreSQL ? `$${n}` : '?';

// Ensure notifications table exists
const ensureTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id ${isPostgreSQL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER NOT NULL,
      type TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT,
      reference_id INTEGER,
      reference_type TEXT,
      is_read INTEGER DEFAULT 0,
      created_at ${isPostgreSQL ? 'TIMESTAMP DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);
};

// GET /api/notifications — user's notifications (newest 50)
router.get('/', protect, async (req, res) => {
  try {
    await ensureTable();
    const rows = await query(
      `SELECT * FROM notifications WHERE user_id = ${p(1)} ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = rows.filter(n => !n.is_read).length;
    res.json({ notifications: rows, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    await ensureTable();
    await query(
      `UPDATE notifications SET is_read = 1 WHERE id = ${p(1)} AND user_id = ${p(2)}`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', protect, async (req, res) => {
  try {
    await ensureTable();
    await query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ${p(1)}`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Helper: create a notification (used internally)
const createNotification = async ({ userId, type, title, message, referenceId, referenceType }) => {
  try {
    await ensureTable();
    await query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)})`,
      [userId, type || 'info', title, message || null, referenceId || null, referenceType || null]
    );
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
