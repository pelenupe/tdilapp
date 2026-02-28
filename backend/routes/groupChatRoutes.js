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

// Get chat messages
router.get('/:chatId/messages', getGroupChatMessages);

// Send message
router.post('/:chatId/messages', sendGroupMessage);

// Flag a specific message
router.post('/:chatId/messages/:messageId/flag', flagMessage);

// Get chat members
router.get('/:chatId/members', getGroupChatMembers);

// Add member to chat
router.post('/:chatId/members', addMemberToChat);

// Join a chat
router.post('/:chatId/join', joinChat);

// Leave chat
router.delete('/:chatId/leave', leaveGroupChat);

module.exports = router;
