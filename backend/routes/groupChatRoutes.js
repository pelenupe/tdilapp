const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserGroupChats,
  getGroupChatMessages,
  sendGroupMessage,
  createGroupChat,
  addMemberToChat,
  getGroupChatMembers,
  leaveGroupChat,
  getOrCreateDirectChat,
  discoverChats,
  joinChat,
  flagMessage,
  getAdminFlags,
  reviewFlag
} = require('../controllers/groupChatController');

// All routes require authentication
router.use(protect);

// Get user's group chats
router.get('/', getUserGroupChats);

// Create new group chat
router.post('/', createGroupChat);

// Get or create direct chat
router.post('/direct', getOrCreateDirectChat);

// Discover chats user can join
router.get('/discover', discoverChats);

// Admin: get flagged messages
router.get('/admin/flags', getAdminFlags);

// Admin: review (dismiss/delete) a flag
router.patch('/admin/flags/:flagId', reviewFlag);

// ─── Chat Observer Management (admin only) ──────────────────────────────────
const { query } = require('../config/database');

const adminOnly = (req, res, next) => {
  if (!['admin', 'founder'].includes(req.user?.userType)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// GET /api/chats/admin/observers — list all current chat observers
router.get('/admin/observers', adminOnly, async (req, res) => {
  try {
    const observers = await query(
      `SELECT id, firstName, lastName, email, userType, chat_observer
       FROM users WHERE chat_observer = 1 ORDER BY firstName ASC`
    );
    res.json(observers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching observers' });
  }
});

// GET /api/chats/admin/eligible-observers — list all admins/founders (can be made observer)
router.get('/admin/eligible-observers', adminOnly, async (req, res) => {
  try {
    const users = await query(
      `SELECT id, firstName, lastName, email, userType, COALESCE(chat_observer, 0) as chat_observer
       FROM users WHERE userType IN ('admin', 'founder') ORDER BY firstName ASC`
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching eligible observers' });
  }
});

// PUT /api/chats/admin/observers/:userId — add or remove a user as chat observer
router.put('/admin/observers/:userId', adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { enabled } = req.body; // true = add, false = remove
    await query(
      `UPDATE users SET chat_observer = ? WHERE id = ?`,
      [enabled ? 1 : 0, userId]
    );
    if (enabled) {
      // Add to all existing chats
      const chats = await query(`SELECT rowid as id FROM group_chats WHERE is_active = 1`);
      for (const chat of chats) {
        await query(
          `INSERT OR IGNORE INTO group_chat_members (group_chat_id, user_id, role) VALUES (?, ?, 'admin')`,
          [chat.id, userId]
        );
      }
    }
    const user = await query(
      `SELECT id, firstName, lastName, email, userType, chat_observer FROM users WHERE id = ?`, [userId]
    );
    res.json({ message: `Observer ${enabled ? 'added' : 'removed'}`, user: user[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating observer' });
  }
});

// Get chat messages
router.get('/:chatId/messages', getGroupChatMessages);

// Send message
router.post('/:chatId/messages', sendGroupMessage);

// Flag a specific message
router.post('/:chatId/messages/:messageId/flag', flagMessage);

// Admin: directly delete a specific message
router.delete('/:chatId/messages/:messageId/admin', async (req, res) => {
  try {
    if (!['admin', 'founder'].includes(req.user?.userType)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { messageId } = req.params;
    await query(`DELETE FROM group_messages WHERE rowid = ?`, [messageId]);
    res.json({ message: 'Message removed' });
  } catch (err) {
    console.error('Admin delete message error:', err);
    res.status(500).json({ message: 'Error removing message' });
  }
});

// Get chat members
router.get('/:chatId/members', getGroupChatMembers);

// Add member to chat
router.post('/:chatId/members', addMemberToChat);

// Join a chat
router.post('/:chatId/join', joinChat);

// Leave chat
router.delete('/:chatId/leave', leaveGroupChat);

module.exports = router;
