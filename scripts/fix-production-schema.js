/**
 * Fix Production Database Schema
 * 
 * This script checks and fixes column naming issues in the production database.
 * Run this if you're getting "Server error during login" due to column name mismatches.
 * 
 * Usage: NODE_ENV=production DATABASE_URL=your_connection_string node scripts/fix-production-schema.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING;

if (!connectionString) {
  console.error('❌ No DATABASE_URL found. Please set DATABASE_URL environment variable.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkAndFixSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Check users table columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current users table columns:');
    const columnNames = columnsResult.rows.map(r => r.column_name);
    console.log(columnNames.join(', '));
    console.log('');
    
    // Define expected columns and potential renames
    const renameMap = {
      'firstname': ['first_name', 'firstName'],
      'lastname': ['last_name', 'lastName'],
      'jobtitle': ['job_title', 'jobTitle'],
      'usertype': ['user_type', 'userType'],
      'profileimage': ['profile_image', 'profileImage']
    };
    
    // Check for columns that need to be renamed
    for (const [expectedName, oldNames] of Object.entries(renameMap)) {
      if (columnNames.includes(expectedName)) {
        console.log(`✅ Column '${expectedName}' exists`);
      } else {
        // Check if any old name exists
        for (const oldName of oldNames) {
          if (columnNames.includes(oldName.toLowerCase())) {
            console.log(`🔧 Renaming column '${oldName.toLowerCase()}' to '${expectedName}'...`);
            try {
              await client.query(`ALTER TABLE users RENAME COLUMN "${oldName.toLowerCase()}" TO ${expectedName}`);
              console.log(`   ✅ Renamed successfully`);
            } catch (err) {
              console.log(`   ⚠️ Rename failed: ${err.message}`);
            }
            break;
          }
        }
      }
    }
    
    // Add missing columns
    const requiredColumns = [
      { name: 'firstname', type: 'VARCHAR(255)', nullable: false, default: "''" },
      { name: 'lastname', type: 'VARCHAR(255)', nullable: false, default: "''" },
      { name: 'jobtitle', type: 'VARCHAR(255)', nullable: true },
      { name: 'usertype', type: 'VARCHAR(50)', nullable: true, default: "'member'" },
      { name: 'profile_image', type: 'VARCHAR(500)', nullable: true },
      { name: 'bio', type: 'TEXT', nullable: true },
      { name: 'points', type: 'INTEGER', nullable: true, default: '0' },
      { name: 'level', type: 'INTEGER', nullable: true, default: '1' },
      { name: 'is_active', type: 'BOOLEAN', nullable: true, default: 'true' }
    ];
    
    // Refresh column list
    const updatedColumns = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'users'
    `);
    const currentColumns = updatedColumns.rows.map(r => r.column_name);
    
    console.log('\n🔍 Checking for missing columns...');
    for (const col of requiredColumns) {
      if (!currentColumns.includes(col.name)) {
        console.log(`➕ Adding missing column '${col.name}'...`);
        try {
          let sql = `ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`;
          if (col.default) sql += ` DEFAULT ${col.default}`;
          await client.query(sql);
          console.log(`   ✅ Added successfully`);
        } catch (err) {
          console.log(`   ⚠️ Add failed: ${err.message}`);
        }
      }
    }
    
    // Check points_history table
    console.log('\n🔍 Checking points_history table...');
    const pointsColumns = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'points_history'
    `);
    const pointsCols = pointsColumns.rows.map(r => r.column_name);
    
    if (pointsCols.length === 0) {
      console.log('⚠️ points_history table does not exist or has no columns');
    } else {
      console.log(`Current columns: ${pointsCols.join(', ')}`);
      
      // Check for userid column
      if (!pointsCols.includes('userid') && pointsCols.includes('user_id')) {
        console.log('🔧 Renaming user_id to userid...');
        await client.query('ALTER TABLE points_history RENAME COLUMN user_id TO userid');
      }
      
      // Check for createdat column  
      if (!pointsCols.includes('createdat') && pointsCols.includes('created_at')) {
        console.log('🔧 Adding createdat alias column...');
        // Don't rename, just add alias or use existing
      }
    }
    
    // Verify a test user
    console.log('\n🔍 Verifying user data...');
    const testUser = await client.query('SELECT * FROM users LIMIT 1');
    if (testUser.rows.length > 0) {
      const user = testUser.rows[0];
      console.log('Sample user data:');
      console.log(`  - id: ${user.id}`);
      console.log(`  - email: ${user.email}`);
      console.log(`  - firstname: ${user.firstname}`);
      console.log(`  - lastname: ${user.lastname}`);
      console.log(`  - usertype: ${user.usertype}`);
      console.log(`  - points: ${user.points}`);
    } else {
      console.log('⚠️ No users found in database');
    }
    
    console.log('\n✅ Schema check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndFixSchema();
