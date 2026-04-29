const { query } = require('../backend/config/database');

(async () => {
  try {
    console.log('Inspecting users with partner_school userType...');
    
    // Check total count of partner_school users
    const total = await query("SELECT COUNT(*) as count FROM users WHERE userType = 'partner_school'");
    console.log('Total partner_school users:', total[0].count);
    
    // Sample a few
    const sample = await query("SELECT id, firstName, lastName, company, userType FROM users WHERE userType = 'partner_school' LIMIT 5");
    console.log('Sample partner_school users:', sample);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
