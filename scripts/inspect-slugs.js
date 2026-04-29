const { query } = require('../backend/config/database');

(async () => {
  try {
    console.log('Inspecting users slug data...');
    
    // Check total count and sample slugs
    const total = await query("SELECT COUNT(*) as count FROM users");
    console.log('Total users:', total[0].count);
    
    const sample = await query("SELECT id, firstName, lastName, slug FROM users LIMIT 10");
    console.log('Sample users:', sample);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
