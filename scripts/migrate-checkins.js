const { query } = require('../backend/config/database');

async function migrate() {
  try {
    console.log('Adding cohort column...');
    await query(`ALTER TABLE users ADD COLUMN cohort TEXT DEFAULT 'Fall 2024 Cohort'`).catch(() => {
      console.log('Cohort column already exists');
    });

    console.log('Creating checkin_tagged_users table...');
    await query(`
      CREATE TABLE IF NOT EXISTS checkin_tagged_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkin_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (checkin_id) REFERENCES checkins(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(checkin_id, user_id)
      )
    `);

    console.log('Setting all users to Fall 2024 Cohort...');
    await query(`UPDATE users SET cohort = 'Fall 2024 Cohort' WHERE cohort IS NULL`);

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
