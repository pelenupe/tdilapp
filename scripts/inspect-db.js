const { query } = require('../backend/config/database');

(async () => {
  try {
    console.log('Inspecting table schema...');
    
    // SQLite-specific way to check columns
    const usersCols = await query("PRAGMA table_info(users)");
    console.log('Users columns:', usersCols.map(c => c.name));
    
    const orgCols = await query("PRAGMA table_info(org_profiles)");
    console.log('Org columns:', orgCols.map(c => c.name));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
