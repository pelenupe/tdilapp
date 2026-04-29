const { query } = require('../backend/config/database');

(async () => {
  try {
    console.log('Inspecting slug values...');
    const users = await query("SELECT id, firstName, lastName, slug FROM users");
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
