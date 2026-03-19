const bcrypt = require('bcryptjs');
const { query } = require('../backend/config/database');

async function createTestAdmin() {
  try {
    const email = 'testadmin@tdil.com';
    const password = 'Test123!';
    
    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.length > 0) {
      console.log(`User ${email} already exists. Updating password...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      await query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);
      console.log(`✅ Password updated for ${email}`);
    } else {
      console.log(`Creating new test admin: ${email}`);
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await query(
        `INSERT INTO users (email, password, firstName, lastName, company, jobTitle, points, level, userType)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [email, hashedPassword, 'Test', 'Admin', 'tDIL', 'Test Admin', 100, 1, 'admin']
      );
      console.log(`✅ Created test admin: ${email}`);
    }
    
    console.log(`\n🔑 TEST LOGIN CREDENTIALS:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`\nTry logging in now!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTestAdmin();
