const { query } = require('../backend/config/database');

(async () => {
  try {
    console.log('Adding slug columns...');
    // Add columns IF NOT EXISTS
    // SQLite syntax for ADD COLUMN IF NOT EXISTS requires checking the table schema or handling errors.
    // Given the environment constraints, we will just run ALTER and log errors if it exists.
    try {
      await query('ALTER TABLE users ADD COLUMN slug VARCHAR(255)');
      console.log('Added slug to users');
    } catch (e) {
      console.log('Column slug might already exist in users');
    }
    
    try {
      await query('ALTER TABLE org_profiles ADD COLUMN slug VARCHAR(255)');
      console.log('Added slug to org_profiles');
    } catch (e) {
      console.log('Column slug might already exist in org_profiles');
    }
    
    console.log('✅ Slug column migration script finished.');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
})();
