const { query } = require('../backend/config/database');

(async () => {
  try {
    console.log('Inspecting raw tables...');
    
    // SQLite: Query sqlite_master to see tables
    const tables = await query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables.map(t => t.name));
    
    // Query users table directly to check its structure
    const users = await query("SELECT * FROM users LIMIT 1");
    console.log('Users sample row (keys):', users.length > 0 ? Object.keys(users[0]) : 'Empty');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
