const { query } = require('../backend/config/database');

(async () => {
  try {
    console.log('Inspecting users slug data on production...');
    
    // Check total count and sample slugs
    const users = await query("SELECT id, firstName, lastName, slug FROM users");
    console.log('Users:', JSON.stringify(users, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
