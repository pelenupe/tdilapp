const { query } = require('../backend/config/database');

(async () => {
  try {
    console.log('Inspecting org_profiles data...');
    
    // Check total count and sample slugs
    const total = await query("SELECT COUNT(*) as count FROM org_profiles");
    console.log('Total orgs:', total[0].count);
    
    const sample = await query("SELECT id, name, slug FROM org_profiles LIMIT 5");
    console.log('Sample orgs:', sample);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
