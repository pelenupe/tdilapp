const { query } = require('../config/database');

// ─── Helpers ────────────────────────────────────────────────────────────────

// Ensure TDIL Staff chat exists and that all admins/founders are members
const ensureStaffChat = async (userId) => {
  try {
    // Find or create the TDIL Staff chat
    let staffChat = await query(
      `SELECT rowid as id, * FROM group_chats WHERE chat_type = 'staff' AND is_active = 1 LIMIT 1`
    );

    let chatId;
    if (staffChat.length === 0) {
      // Create the staff chat
      await query(
        `INSERT INTO group_chats (name, chat_type, description, is_active, created_by) VALUES (?, 'staff', 'Internal tDIL staff communication channel', 1, ?)`,
        ['TDIL Staff', userId]
      );
      const lastId = await query('SELECT last_insert_rowid() as id');
      chatId = lastId[0].id;
    } else {
      chatId = staffChat[0].id;
    }

    // Ensure this user is a member
    await query(
      `INSERT OR IGNORE INTO group_chat_members (group_chat_id, user_id, role) VALUES (?, ?, 'admin')`,
      [chatId, userId]
    );

    // Also auto-add ALL other admins/founders who aren't members yet
    try {
      const admins = await query(
        `SELECT id FROM users WHERE (userType = 'admin' OR userType = 'founder') AND id != ?`,
        [userId]
      );
      for (const admin of admins) {
        await query(
          `INSERT OR IGNORE INTO group_chat_members (group_chat_id, user_id, role) VALUES (?, ?, 'admin')`,
          [chatId, admin.id]
        );
      }
    } catch (_) { /* non-fatal */ }

    return chatId;
  } catch (err) {
    console.warn('ensureStaffChat non-fatal error:', err.message);
    return null;
  }
};

// ─── Get user's group chats ──────────────────────────────────────────────────

const getUserGroupChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdminUser = ['admin', 'founder'].includes(req.user.userType);

    // Auto-add admins to staff chat
    if (isAdminUser) {
      await ensureStaffChat(userId);
    }

    // Get all chats this user is a member of
    const memberships = await query(
      `SELECT group_chat_id FROM group_chat_members WHERE user_id = ?`,
      [userId]
    );

    const chats = [];
    for (const m of memberships) {
      const details = await query(
        `SELECT rowid as id, * FROM group_chats WHERE rowid = ? AND is_active = 1`,
        [m.group_chat_id]
      );
      if (details.length > 0) {
        details[0].id = m.group_chat_id;
        chats.push(details[0]);
      }
    }

    // Enrich each chat
    for (const chat of chats) {
      const memberCount = await query(
        'SELECT COUNT(*) as count FROM group_chat_members WHERE group_chat_id = ?',
        [chat.id]
      );
      chat.member_count = memberCount[0]?.count || 0;

      if (chat.chat_type === 'direct') {
        const other = await query(
          `SELECT u.id, u.firstName, u.lastName, u.profileImage
           FROM users u
           JOIN group_chat_members gcm ON gcm.user_id = u.id
           WHERE gcm.group_chat_id = ? AND u.id != ? LIMIT 1`,
          [chat.id, userId]
        );
        if (other.length > 0) {
          chat.name = `${other[0].firstName} ${other[0].lastName}`;
          chat.other_user = other[0];
        }
      }

      const lastMsg = await query(
        'SELECT content, created_at FROM group_messages WHERE group_chat_id = ? ORDER BY created_at DESC LIMIT 1',
        [chat.id]
      );
      chat.last_message = lastMsg[0]?.content || null;
      chat.last_message_at = lastMsg[0]?.created_at || null;
      chat.unread_count = 0;
    }

    // Sort: staff first, then cohort, then custom, then direct
    const typeOrder = { staff: 0, cohort: 1, custom: 2, direct: 3 };
    chats.sort((a, b) => (typeOrder[a.chat_type] ?? 9) - (typeOrder[b.chat_type] ?? 9));

    res.json(chats);
  } catch (error) {
    console.error('Error getting user group chats:', error);
    res.status(500).json({ message: 'Error getting group chats' });
  }
};

// ─── Discover chats user can join ────────────────────────────────────────────

const discoverChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get IDs of chats user is already in
    const memberships = await query(
      'SELECT group_chat_id FROM group_chat_members WHERE user_id = ?',
      [userId]
    );
    const memberOf = new Set(memberships.map(m => m.group_chat_id));

    // Get all public/cohort/custom chats the user isn't in
    const allChats = await query(
      `SELECT rowid as id, * FROM group_chats
       WHERE is_active = 1 AND chat_type IN ('cohort', 'custom')
       ORDER BY name ASC`
    );

    const discoverable = [];
    for (const chat of allChats) {
      chat.id = chat.rowid || chat.id;
      if (memberOf.has(chat.id)) continue;

      const memberCount = await query(
        'SELECT COUNT(*) as count FROM group_chat_members WHERE group_chat_id = ?',
        [chat.id]
      );
      chat.member_count = memberCount[0]?.count || 0;
      discoverable.push(chat);
    }

    res.json(discoverable);
  } catch (error) {
    console.error('Error discovering chats:', error);
    res.status(500).json({ message: 'Error discovering chats' });
  }
};

// ─── Join a chat ──────────────────────────────────────────────────────────────

const joinChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    // Verify chat exists and is joinable
    const chat = await query(
      `SELECT rowid as id, chat_type, is_active FROM group_chats WHERE rowid = ?`,
      [chatId]
    );

    if (!chat.length || !chat[0].is_active) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!['cohort', 'custom'].includes(chat[0].chat_type)) {
      return res.status(400).json({ message: 'This chat cannot be joined directly' });
    }

    // Add user to chat
    await query(
      `INSERT OR IGNORE INTO group_chat_members (group_chat_id, user_id, role) VALUES (?, ?, 'member')`,
      [chatId, userId]
    );

    // Post a join message
    try {
      const u = await query('SELECT firstName, lastName FROM users WHERE id = ?', [userId]);
      await query(
        `INSERT INTO group_messages (group_chat_id, sender_id, content, message_type) VALUES (?, ?, ?, 'system')`,
        [chatId, userId, `${u[0]?.firstName} ${u[0]?.lastName} joined the group`]
      );
    } catch (_) { /* non-fatal */ }

    res.json({ message: 'Joined chat successfully', chatId });
  } catch (error) {
    console.error('Error joining chat:', error);
    res.status(500).json({ message: 'Error joining chat' });
  }
};

// ─── Flag a message ───────────────────────────────────────────────────────────

const flagMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId, messageId } = req.params;
    const { reason } = req.body;

    // Check if already flagged by this user
    const existing = await query(
      `SELECT id FROM message_flags WHERE message_id = ? AND reported_by = ?`,
      [messageId, userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'You already flagged this message' });
    }

    // Get message content + sender name for context
    let msgContent = '';
    let senderName = '';
    try {
      const msg = await query(
        `SELECT gm.content, u.firstName, u.lastName
         FROM group_messages gm
         LEFT JOIN users u ON gm.sender_id = u.id
         WHERE gm.rowid = ?`,
        [messageId]
      );
      if (msg.length > 0) {
        msgContent = msg[0].content || '';
        senderName = `${msg[0].firstName || ''} ${msg[0].lastName || ''}`.trim();
      }
    } catch (_) { /* non-fatal */ }

    await query(
      `INSERT INTO message_flags (message_id, chat_id, reported_by, reason, message_content, sender_name, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [messageId, chatId, userId, reason || null, msgContent, senderName]
    );

    res.json({ message: 'Message flagged for review. Thank you.' });
  } catch (error) {
    console.error('Error flagging message:', error);
    res.status(500).json({ message: 'Error flagging message' });
  }
};

// ─── Admin: get all flagged messages ─────────────────────────────────────────

const getAdminFlags = async (req, res) => {
  try {
    if (!['admin', 'founder'].includes(req.user?.userType)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const flags = await query(
      `SELECT mf.id, mf.message_id, mf.chat_id, mf.reason, mf.message_content, 
              mf.sender_name, mf.status, mf.created_at,
              u.firstName as reporter_first, u.lastName as reporter_last,
              gc.name as chat_name
       FROM message_flags mf
       LEFT JOIN users u ON mf.reported_by = u.id
       LEFT JOIN group_chats gc ON gc.rowid = mf.chat_id
       WHERE mf.status = 'pending'
       ORDER BY mf.created_at DESC
       LIMIT 100`
    );

    res.json(flags);
  } catch (error) {
    console.error('Error getting flags:', error);
    res.status(500).json({ message: 'Error getting flagged messages' });
  }
};

// ─── Admin: review (dismiss or delete) a flagged message ─────────────────────

const reviewFlag = async (req, res) => {
  try {
    if (!['admin', 'founder'].includes(req.user?.userType)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { flagId } = req.params;
    const { action } = req.body; // 'dismiss' | 'delete'

    // Get flag info
    const flags = await query(
      'SELECT * FROM message_flags WHERE id = ?',
      [flagId]
    );
    if (!flags.length) return res.status(404).json({ message: 'Flag not found' });
    const flag = flags[0];

    if (action === 'delete') {
      // Delete the original message
      try {
        await query('DELETE FROM group_messages WHERE rowid = ?', [flag.message_id]);
      } catch (_) { /* rowid might differ */ }
    }

    // Mark flag as reviewed
    await query(
      `UPDATE message_flags SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`,
      [action === 'delete' ? 'deleted' : 'dismissed', req.user.id, flagId]
    );

    res.json({ message: `Flag ${action === 'delete' ? 'acted on' : 'dismissed'} successfully` });
  } catch (error) {
    console.error('Error reviewing flag:', error);
    res.status(500).json({ message: 'Error reviewing flag' });
  }
};

// ─── Get group chat messages ──────────────────────────────────────────────────

const getGroupChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { limit = 50, before } = req.query;

    // Admins can read any chat
    const isAdmin = ['admin', 'founder'].includes(req.user.userType);
    if (!isAdmin) {
      const membership = await query(
        'SELECT * FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?',
        [chatId, userId]
      );
      if (membership.length === 0) {
        return res.status(403).json({ message: 'Not a member of this chat' });
      }
    }

    let sql = `
      SELECT gm.rowid as id, gm.group_chat_id, gm.sender_id, gm.content, gm.message_type,
             gm.metadata, gm.created_at, u.firstName as firstname, u.lastName as lastname,
             u.profileImage as profile_image
      FROM group_messages gm
      JOIN users u ON gm.sender_id = u.id
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

    // Update last_read_at (non-fatal)
    try {
      await query(
        `UPDATE group_chat_members SET last_read_at = datetime('now') WHERE group_chat_id = ? AND user_id = ?`,
        [chatId, userId]
      );
    } catch (_) {}

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error getting group chat messages:', error);
    res.status(500).json({ message: 'Error getting messages' });
  }
};

// ─── Send group chat message ──────────────────────────────────────────────────

const sendGroupMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { content, messageType = 'text', metadata } = req.body;

    // Admins can post in any chat; regular users must be members
    const isAdmin = ['admin', 'founder'].includes(req.user.userType);
    if (!isAdmin) {
      const membership = await query(
        'SELECT * FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?',
        [chatId, userId]
      );
      if (membership.length === 0) {
        return res.status(403).json({ message: 'Not a member of this chat' });
      }
    }

    await query(
      `INSERT INTO group_messages (group_chat_id, sender_id, content, message_type, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [chatId, userId, content, messageType, metadata ? JSON.stringify(metadata) : null]
    );

    const lastIdResult = await query('SELECT last_insert_rowid() as id');
    const messageId = lastIdResult[0].id;

    const newMessage = await query(
      `SELECT gm.rowid as id, gm.group_chat_id, gm.sender_id, gm.content, gm.message_type,
              gm.metadata, gm.created_at, u.firstName as firstname, u.lastName as lastname,
              u.profileImage as profile_image
       FROM group_messages gm
       JOIN users u ON gm.sender_id = u.id
       WHERE gm.rowid = ?`,
      [messageId]
    );

    res.json(newMessage[0]);
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
};

// ─── Create custom group chat ─────────────────────────────────────────────────

const createGroupChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, memberIds } = req.body;

    await query(
      `INSERT INTO group_chats (name, chat_type, description, created_by) VALUES (?, 'custom', ?, ?)`,
      [name, description, userId]
    );
    const lastId = await query('SELECT last_insert_rowid() as id');
    const chatId = lastId[0].id;

    await query(
      'INSERT INTO group_chat_members (group_chat_id, user_id, role) VALUES (?, ?, ?)',
      [chatId, userId, 'admin']
    );

    if (Array.isArray(memberIds)) {
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          await query(
            'INSERT OR IGNORE INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)',
            [chatId, memberId]
          );
        }
      }
    }

    const newChat = await query('SELECT rowid as id, * FROM group_chats WHERE rowid = ?', [chatId]);
    res.json({ ...newChat[0], id: chatId });
  } catch (error) {
    console.error('Error creating group chat:', error);
    res.status(500).json({ message: 'Error creating group chat' });
  }
};

// ─── Add member to group chat ─────────────────────────────────────────────────

const addMemberToChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { memberId } = req.body;

    const isAdmin = ['admin', 'founder'].includes(req.user.userType);
    if (!isAdmin) {
      const membership = await query(
        `SELECT * FROM group_chat_members WHERE group_chat_id = ? AND user_id = ? AND role = 'admin'`,
        [chatId, userId]
      );
      if (membership.length === 0) {
        return res.status(403).json({ message: 'Only admins can add members' });
      }
    }

    await query(
      'INSERT OR IGNORE INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)',
      [chatId, memberId]
    );

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Error adding member to chat:', error);
    res.status(500).json({ message: 'Error adding member' });
  }
};

// ─── Get group chat members ───────────────────────────────────────────────────

const getGroupChatMembers = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const isAdmin = ['admin', 'founder'].includes(req.user.userType);
    if (!isAdmin) {
      const membership = await query(
        'SELECT * FROM group_chat_members WHERE group_chat_id = ? AND user_id = ?',
        [chatId, userId]
      );
      if (membership.length === 0) {
        return res.status(403).json({ message: 'Not a member of this chat' });
      }
    }

    const members = await query(
      `SELECT u.id, u.firstName as firstname, u.lastName as lastname,
              u.profileImage as profile_image, u.points, u.level,
              gcm.role, gcm.joined_at
       FROM group_chat_members gcm
       JOIN users u ON gcm.user_id = u.id
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

// ─── Leave group chat ─────────────────────────────────────────────────────────

const leaveGroupChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    const chat = await query(
      'SELECT chat_type FROM group_chats WHERE rowid = ?',
      [chatId]
    );

    if (chat.length > 0 && ['cohort', 'staff'].includes(chat[0].chat_type)) {
      return res.status(400).json({ message: 'Cannot leave this chat' });
    }

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

// ─── Get or create direct chat ────────────────────────────────────────────────

const getOrCreateDirectChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.body;

    const existing = await query(
      `SELECT gcm1.group_chat_id
       FROM group_chat_members gcm1
       JOIN group_chat_members gcm2 ON gcm1.group_chat_id = gcm2.group_chat_id
       JOIN group_chats gc ON gc.rowid = gcm1.group_chat_id
       WHERE gcm1.user_id = ? AND gcm2.user_id = ? AND gc.chat_type = 'direct' AND gc.is_active = 1
       LIMIT 1`,
      [userId, otherUserId]
    );

    if (existing.length > 0) {
      const chatId = existing[0].group_chat_id;
      const chat = await query('SELECT rowid as id, * FROM group_chats WHERE rowid = ?', [chatId]);
      return res.json({ ...chat[0], id: chatId, chatId });
    }

    await query(
      `INSERT INTO group_chats (chat_type, created_by, is_active) VALUES ('direct', ?, 1)`,
      [userId]
    );
    const lastId = await query('SELECT last_insert_rowid() as id');
    const chatId = lastId[0].id;

    await query('INSERT INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)', [chatId, userId]);
    await query('INSERT INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)', [chatId, otherUserId]);

    const newChat = await query('SELECT rowid as id, * FROM group_chats WHERE rowid = ?', [chatId]);
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
  getOrCreateDirectChat,
  discoverChats,
  joinChat,
  flagMessage,
  getAdminFlags,
  reviewFlag
};
