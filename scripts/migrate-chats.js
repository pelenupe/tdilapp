const { query } = require('../backend/config/database');

async function migrate() {
  try {
    console.log('Creating chat tables...');
    
    // Create group_chats table
    await query(`
      CREATE TABLE IF NOT EXISTS group_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        cohort TEXT,
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Create group_chat_members table
    await query(`
      CREATE TABLE IF NOT EXISTS group_chat_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (chat_id) REFERENCES group_chats(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(chat_id, user_id)
      )
    `);

    // Create direct_chats table
    await query(`
      CREATE TABLE IF NOT EXISTS direct_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1_id INTEGER NOT NULL,
        user2_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user1_id, user2_id)
      )
    `);

    // Create chat_messages table
    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Updating all users to Indiana - Cohort 9...');
    await query(`UPDATE users SET cohort = 'Indiana - Cohort 9'`);

    console.log('Creating Indiana - Cohort 9 group chat...');
    
    // Check if cohort chat exists
    const existingChat = await query(
      `SELECT id FROM group_chats WHERE cohort = 'Indiana - Cohort 9'`
    );

    let chatId;
    if (existingChat.length === 0) {
      // Create the cohort group chat
      const chatResult = await query(
        `INSERT INTO group_chats (name, description, cohort) 
         VALUES ('Indiana - Cohort 9', 'Group chat for Indiana Cohort 9 members', 'Indiana - Cohort 9')
         RETURNING id`
      );
      chatId = chatResult[0].id;
      console.log(`Created cohort chat with ID: ${chatId}`);
    } else {
      chatId = existingChat[0].id;
      console.log(`Cohort chat already exists with ID: ${chatId}`);
    }

    // Add all users to the cohort chat
    const users = await query(`SELECT id FROM users WHERE cohort = 'Indiana - Cohort 9'`);
    console.log(`Adding ${users.length} users to cohort chat...`);
    
    for (const user of users) {
      await query(
        `INSERT OR IGNORE INTO group_chat_members (chat_id, user_id) VALUES ($1, $2)`,
        [chatId, user.id]
      );
    }

    console.log('✅ Migration complete! Chat system ready.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
