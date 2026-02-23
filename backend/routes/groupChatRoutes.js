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
  getOrCreateDirectChat
} = require('../controllers/groupChatController');

// All routes require authentication
router.use(protect);

// Get user's group chats
router.get('/', getUserGroupChats);

// Create new group chat
router.post('/', createGroupChat);

// Get or create direct chat
router.post('/direct', getOrCreateDirectChat);

// Get chat messages
router.get('/:chatId/messages', getGroupChatMessages);

// Send message
router.post('/:chatId/messages', sendGroupMessage);

// Get chat members
router.get('/:chatId/members', getGroupChatMembers);

// Add member to chat
router.post('/:chatId/members', addMemberToChat);

// Leave chat
router.delete('/:chatId/leave', leaveGroupChat);

module.exports = router;
