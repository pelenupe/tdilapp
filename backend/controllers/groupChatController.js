const { query } = require('../config/database');

// Get user's group chats
const getUserGroupChats = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('getUserGroupChats called for userId:', userId);

    // Query from memberships table instead (IDs are broken in group_chats)
    const memberships = await query(
      `SELECT group_chat_id FROM group_chat_members WHERE user_id = ?`,
      [userId]
    );

    const chats = [];
    for (let membership of memberships) {
      const chatDetails = await query(
        `SELECT * FROM group_chats WHERE rowid = ? AND is_active = 1`,
        [membership.group_chat_id]
      );
      if (chatDetails.length > 0) {
        // Use rowid as id since id column is broken
        chatDetails[0].id = membership.group_chat_id;
        chats.push(chatDetails[0]);
      }
    }

    console.log('Found', chats.length, 'chats for user', userId);

    // Get member count, last message, and other user info for each chat
    for (let chat of chats) {
      // Get member count
      const memberCount = await query(
        'SELECT COUNT(*) as count FROM group_chat_members WHERE group_chat_id = ?',
        [chat.id]
      );
      chat.member_count = memberCount[0]?.count || 0;

      // For direct chats, get the other user's info
      if (chat.chat_type === 'direct') {
        const otherUser = await query(
          `SELECT u.id, u.firstName, u.lastName, u.profileImage
           FROM users u
           INNER JOIN group_chat_members gcm ON gcm.user_id = u.id
           WHERE gcm.group_chat_id = ? AND u.id != ?
           LIMIT 1`,
          [chat.id, userId]
        );
        
        if (otherUser.length > 0) {
          chat.name = `${otherUser[0].firstName} ${otherUser[0].lastName}`;
          chat.other_user = otherUser[0];
        }
      }

      // Get last message
      const lastMsg = await query(
        'SELECT content, created_at FROM group_messages WHERE group_chat_id = ? ORDER BY created_at DESC LIMIT 1',
        [chat.id]
      );
      chat.last_message = lastMsg[0]?.content || null;
      chat.last_message_at = lastMsg[0]?.created_at || null;
      chat.unread_count = 0; // Simplified for now
    }

    res.json(chats);
  } catch (error) {
    console.error('Error getting user group chats:', error);
    res.status(500).json({ message: 'Error getting group chats' });
  }
};

// Get group chat messages
const getGroupChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { limit = 50, before } = req.query;

    // Verify user is member
    const membership = await query(
      'SELECT * FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?',
      [chatId, userId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ message: 'Not a member of this chat' });
    }

    // Get messages
    let sql = `
      SELECT gm.rowid as id, gm.group_chat_id, gm.sender_id, gm.content, gm.message_type, 
              gm.metadata, gm.created_at, u.firstName as firstname, u.lastName as lastname, 
              u.profileImage as profile_image
      FROM group_messages gm
      INNER JOIN users u ON gm.sender_id = u.id
      WHERE gm.group_chat_id = ?
    `;
    const params = [chatId];

    if (before) {
      sql += ' AND gm.created_at < ?';
      params.push(before);
    }

    sql += ' ORDER BY gm.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const messages = await query(sql, params);

    // Update last_read_at
    await query(
      `UPDATE group_chat_members 
       SET last_read_at = datetime('now') 
       WHERE group_chat_id = ? AND user_id = ?`,
      [chatId, userId]
    );

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error getting group chat messages:', error);
    res.status(500).json({ message: 'Error getting messages' });
  }
};

// Send group chat message
const sendGroupMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { content, messageType = 'text', metadata } = req.body;

    // Verify user is member
    const membership = await query(
      'SELECT * FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?',
      [chatId, userId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ message: 'Not a member of this chat' });
    }

    // Send message
    const result = await query(
      `INSERT INTO group_messages (group_chat_id, sender_id, content, message_type, metadata) 
       VALUES (?, ?, ?, ?, ?)`,
      [chatId, userId, content, messageType, metadata ? JSON.stringify(metadata) : null]
    );

    // Get the inserted row ID
    const lastIdResult = await query('SELECT last_insert_rowid() as id');
    const messageId = lastIdResult[0].id;

    const newMessage = await query(
      `SELECT gm.rowid as id, gm.group_chat_id, gm.sender_id, gm.content, gm.message_type, 
              gm.metadata, gm.created_at, u.firstName as firstname, u.lastName as lastname, 
              u.profileImage as profile_image
       FROM group_messages gm
       INNER JOIN users u ON gm.sender_id = u.id
       WHERE gm.rowid = ?`,
      [messageId]
    );

    console.log('New message data:', JSON.stringify(newMessage[0]));
    res.json(newMessage[0]);
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
};

// Create custom group chat
const createGroupChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, memberIds } = req.body;

    // Create chat
    const result = await query(
      `INSERT INTO group_chats (name, chat_type, description, created_by) 
       VALUES (?, 'custom', ?, ?)`,
      [name, description, userId]
    );

    const chatId = result[0].id;

    // Add creator as admin
    await query(
      'INSERT INTO group_chat_members (group_chat_id, user_id, role) VALUES (?, ?, ?)',
      [chatId, userId, 'admin']
    );

    // Add other members
    if (memberIds && Array.isArray(memberIds)) {
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          await query(
            'INSERT INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)',
            [chatId, memberId]
          );
        }
      }
    }

    const newChat = await query('SELECT * FROM group_chats WHERE id = ?', [chatId]);
    res.json(newChat[0]);
  } catch (error) {
    console.error('Error creating group chat:', error);
    res.status(500).json({ message: 'Error creating group chat' });
  }
};

// Add member to group chat
const addMemberToChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { memberId } = req.body;

    // Verify requester is admin
    const membership = await query(
      'SELECT * FROM group_chat_members WHERE group_chat_id = ? AND user_id = ? AND role = ?',
      [chatId, userId, 'admin']
    );

    if (membership.length === 0) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    // Add member
    await query(
      'INSERT OR IGNORE INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)',
      [chatId, memberId]
    );

    // Send system message
    await query(
      `INSERT INTO group_messages (group_chat_id, sender_id, content, message_type) 
       VALUES (?, ?, ?, 'system')`,
      [chatId, userId, 'Added a new member to the chat']
    );

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Error adding member to chat:', error);
    res.status(500).json({ message: 'Error adding member' });
  }
};

// Get group chat members
const getGroupChatMembers = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user is member
    const membership = await query(
      'SELECT * FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?',
      [chatId, userId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ message: 'Not a member of this chat' });
    }

    const members = await query(
      `SELECT u.id, u.firstName as firstname, u.lastName as lastname, u.profileImage as profile_image, u.points, u.level,
              gcm.role, gcm.joined_at
       FROM group_chat_members gcm
       INNER JOIN users u ON gcm.user_id = u.id
       WHERE gcm.group_chat_id = ?
       ORDER BY gcm.joined_at ASC`,
      [chatId]
    );

    res.json(members);
  } catch (error) {
    console.error('Error getting chat members:', error);
    res.status(500).json({ message: 'Error getting members' });
  }
};

// Leave group chat
const leaveGroupChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    // Can't leave cohort chats
    const chat = await query('SELECT chat_type FROM group_chats WHERE id = ?', [chatId]);
    if (chat.length > 0 && chat[0].chat_type === 'cohort') {
      return res.status(400).json({ message: 'Cannot leave cohort chat' });
    }

    // Remove member
    await query(
      'DELETE FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?',
      [chatId, userId]
    );

    res.json({ message: 'Left chat successfully' });
  } catch (error) {
    console.error('Error leaving chat:', error);
    res.status(500).json({ message: 'Error leaving chat' });
  }
};

// Get or create direct message chat between two users
const getOrCreateDirectChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.body;
    const targetUserId = otherUserId;

    // Check if direct chat exists (using group_chat_id from memberships)
    const existingMemberships = await query(
      `SELECT gcm1.group_chat_id 
       FROM group_chat_members gcm1
       INNER JOIN group_chat_members gcm2 ON gcm1.group_chat_id = gcm2.group_chat_id
       INNER JOIN group_chats gc ON gc.rowid = gcm1.group_chat_id
       WHERE gcm1.user_id = ? AND gcm2.user_id = ? AND gc.chat_type = 'direct' AND gc.is_active = 1
       LIMIT 1`,
      [userId, targetUserId]
    );

    if (existingMemberships.length > 0) {
      const chatId = existingMemberships[0].group_chat_id;
      const chat = await query('SELECT * FROM group_chats WHERE rowid = ?', [chatId]);
      return res.json({ ...chat[0], id: chatId, chatId });
    }

    // Create new direct chat
    const result = await query(
      `INSERT INTO group_chats (chat_type, created_by, is_active) VALUES ('direct', ?, 1)`,
      [userId]
    );

    // Get the last inserted rowid
    const lastIdResult = await query('SELECT last_insert_rowid() as id');
    const chatId = lastIdResult[0].id;

    console.log('Created chat with rowid:', chatId);

    // Add both users
    await query(
      'INSERT INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)',
      [chatId, userId]
    );
    
    await query(
      'INSERT INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)',
      [chatId, targetUserId]
    );

    const newChat = await query('SELECT * FROM group_chats WHERE rowid = ?', [chatId]);
    res.json({ ...newChat[0], id: chatId, chatId });
  } catch (error) {
    console.error('Error getting/creating direct chat:', error);
    res.status(500).json({ message: 'Error creating chat' });
  }
};

module.exports = {
  getUserGroupChats,
  getGroupChatMessages,
  sendGroupMessage,
  createGroupChat,
  addMemberToChat,
  getGroupChatMembers,
  leaveGroupChat,
  getOrCreateDirectChat
};
