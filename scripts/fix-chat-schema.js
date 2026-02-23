const { query } = require('../backend/config/database');

async function migrate() {
  try {
    console.log('Dropping and recreating group_chat_members with correct columns...');
    
    // Drop old table
    await query(`DROP TABLE IF EXISTS group_chat_members`);
    
    // Create with correct columns
    await query(`
      CREATE TABLE group_chat_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_chat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        last_read_at TEXT,
        joined_at TEXT DEFAULT (datetime('now')),
        UNIQUE(group_chat_id, user_id)
      )
    `);

    // Drop and recreate group_chats with correct columns
    await query(`DROP TABLE IF EXISTS group_chats`);
    
    await query(`
      CREATE TABLE group_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        chat_type TEXT DEFAULT 'direct',
        description TEXT,
        cohort TEXT,
        created_by INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    console.log('Recreating Indiana - Cohort 9 group chat...');
    const chatResult = await query(
      `INSERT INTO group_chats (name, chat_type, cohort, is_active) 
       VALUES ('Indiana - Cohort 9', 'cohort', 'Indiana - Cohort 9', 1)`
    );

    const chatId = chatResult[0].id || 1;
    console.log('Created cohort chat with ID:', chatId);

    // Add all users to cohort chat
    const users = await query(`SELECT id FROM users WHERE cohort = 'Indiana - Cohort 9'`);
    console.log(`Adding ${users.length} users to cohort chat...`);
    
    for (const user of users) {
      await query(
        `INSERT INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)`,
        [chatId, user.id]
      );
    }

    console.log('✅ Chat schema fixed! All users added to cohort chat.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
