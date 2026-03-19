const { query } = require('../backend/config/database');

async function checkSchema() {
  try {
    console.log('Checking database schema...\n');
    
    // Try to get a user
    const users = await query('SELECT * FROM users LIMIT 1');
    
    if (users.length > 0) {
      console.log('Actual column names in database:');
      console.log(Object.keys(users[0]));
      console.log('\nSample user data:');
      console.log(users[0]);
    } else {
      console.log('No users found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
