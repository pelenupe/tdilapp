const express = require('express');
const { query, isPostgreSQL } = require('../config/database');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

const p = (n) => isPostgreSQL ? `$${n}` : '?';

// Admin-only guard
const adminOnly = (req, res, next) => {
  if (!['admin', 'founder'].includes(req.user?.userType)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// ─── GET all announcements (public) ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const rows = await query(
      `SELECT * FROM announcements ORDER BY featured DESC, createdAt DESC LIMIT ${p(1)}`,
      [limit]
    );
    res.json(rows || []);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.json([]);
  }
});

// ─── GET featured announcements ───────────────────────────────────────────────
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const rows = await query(
      `SELECT * FROM announcements ORDER BY featured DESC, createdAt DESC LIMIT ${p(1)}`,
      [limit]
    );
    res.json(rows || []);
  } catch (err) {
    console.error('Error fetching featured announcements:', err);
    res.json([]);
  }
});

// ─── POST create announcement (admin) ────────────────────────────────────────
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, content, category, featured, priority, author } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Ensure author/priority columns exist (non-fatal migration)
    try {
      await query('ALTER TABLE announcements ADD COLUMN author TEXT');
    } catch (_) {}
    try {
      await query("ALTER TABLE announcements ADD COLUMN priority TEXT DEFAULT 'normal'");
    } catch (_) {}

    const result = await query(
      `INSERT INTO announcements (title, content, category, featured, priority, author)
       VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)})`,
      [title, content, category || 'general', featured ? 1 : 0, priority || 'normal',
       author || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Admin']
    );

    // SQLite last insert
    let newId;
    try {
      const lid = await query('SELECT last_insert_rowid() as id');
      newId = lid[0].id;
    } catch (_) {
      newId = result[0]?.id;
    }

    const created = await query(`SELECT * FROM announcements WHERE id = ${p(1)}`, [newId]);
    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ message: 'Error creating announcement', details: err.message });
  }
});

// ─── PATCH update announcement (admin) ───────────────────────────────────────
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, featured, priority } = req.body;

    const updates = [];
    const vals = [];
    let i = 1;

    if (title !== undefined) { updates.push(`title = ${p(i++)}`); vals.push(title); }
    if (content !== undefined) { updates.push(`content = ${p(i++)}`); vals.push(content); }
    if (category !== undefined) { updates.push(`category = ${p(i++)}`); vals.push(category); }
    if (featured !== undefined) { updates.push(`featured = ${p(i++)}`); vals.push(featured ? 1 : 0); }
    if (priority !== undefined) { updates.push(`priority = ${p(i++)}`); vals.push(priority); }

    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });

    vals.push(id);
    await query(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ${p(i)}`, vals);

    const updated = await query(`SELECT * FROM announcements WHERE id = ${p(1)}`, [id]);
    res.json(updated[0] || { message: 'Updated' });
  } catch (err) {
    console.error('Error updating announcement:', err);
    res.status(500).json({ message: 'Error updating announcement' });
  }
});

// ─── DELETE announcement (admin) ─────────────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await query(`DELETE FROM announcements WHERE id = ${p(1)}`, [req.params.id]);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('Error deleting announcement:', err);
    res.status(500).json({ message: 'Error deleting announcement' });
  }
});

module.exports = router;
