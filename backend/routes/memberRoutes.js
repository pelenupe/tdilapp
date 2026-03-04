const express = require('express');
const { getMembers, getProfile, updateProfile } = require('../controllers/memberController');
const { authenticateToken } = require('../middleware/enhancedAuthMiddleware');
const multer = require('multer');
const router = express.Router();

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// All routes require authentication
router.use(authenticateToken);

// GET /api/members - Get all members
router.get('/', getMembers);

// GET /api/members/me - Get current user's profile
router.get('/me', (req, res) => getProfile(req, res));

// GET /api/members/:id - Get specific member profile
router.get('/:id', getProfile);

// PUT /api/members/update - Update current user's profile
router.put('/update', upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), updateProfile);

// ─── ADMIN routes ─────────────────────────────────────────────────────────────
const { query, isPostgreSQL } = require('../config/database');
const p = (n) => isPostgreSQL ? `$${n}` : '?';

const adminOnly = (req, res, next) => {
  if (!['admin', 'founder'].includes(req.user?.userType)) return res.status(403).json({ message: 'Admin access required' });
  next();
};

// PUT /api/members/admin/:id — admin updates any user's role/points/level
router.put('/admin/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { userType, points, level, firstName, lastName } = req.body;
    const updates = [];
    const vals = [];
    let i = 1;
    if (userType !== undefined) { updates.push(`userType = ${p(i++)}`); vals.push(userType); }
    if (points !== undefined) { updates.push(`points = ${p(i++)}`); vals.push(parseInt(points) || 0); }
    if (level !== undefined) { updates.push(`level = ${p(i++)}`); vals.push(parseInt(level) || 1); }
    if (firstName !== undefined) { updates.push(`firstName = ${p(i++)}`); vals.push(firstName); }
    if (lastName !== undefined) { updates.push(`lastName = ${p(i++)}`); vals.push(lastName); }
    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });
    vals.push(id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ${p(i)}`, vals);
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user', details: err.message });
  }
});

// DELETE /api/members/admin/:id — admin deletes a user
router.delete('/admin/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    // Clean up related records
    for (const t of ['checkins','connections','event_registrations','group_chat_members','notifications','user_sessions']) {
      await query(`DELETE FROM ${t} WHERE user_id = ${p(1)}`, [id]).catch(() => {});
    }
    await query(`DELETE FROM group_messages WHERE sender_id = ${p(1)}`, [id]).catch(() => {});
    await query(`DELETE FROM users WHERE id = ${p(1)}`, [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', details: err.message });
  }
});

module.exports = router;
