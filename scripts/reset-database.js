/**
 * Reset Production Database
 * 
 * ⚠️ WARNING: This will DELETE ALL DATA and recreate tables with correct schema.
 * 
 * Usage: DATABASE_URL=your_connection_string node scripts/reset-database.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const connectionString = process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING;

if (!connectionString) {
  console.error('❌ No DATABASE_URL found. Please set DATABASE_URL environment variable.');
  console.log('Usage: DATABASE_URL=your_connection_string node scripts/reset-database.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('⚠️  WARNING: This will DELETE ALL DATA!');
    console.log('Starting in 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🗑️  Dropping existing tables...');
    
    // Drop tables in correct order (respecting foreign keys)
    const dropTables = [
      'DROP TABLE IF EXISTS audit_log CASCADE',
      'DROP TABLE IF EXISTS user_sessions CASCADE',
      'DROP TABLE IF EXISTS job_applications CASCADE',
      'DROP TABLE IF EXISTS event_attendees CASCADE',
      'DROP TABLE IF EXISTS reward_redemptions CASCADE',
      'DROP TABLE IF EXISTS rewards CASCADE',
      'DROP TABLE IF EXISTS messages CASCADE',
      'DROP TABLE IF EXISTS connections CASCADE',
      'DROP TABLE IF EXISTS points_history CASCADE',
      'DROP TABLE IF EXISTS announcements CASCADE',
      'DROP TABLE IF EXISTS jobs CASCADE',
      'DROP TABLE IF EXISTS events CASCADE',
      'DROP TABLE IF EXISTS invite_tokens CASCADE',
      'DROP TABLE IF EXISTS users CASCADE'
    ];
    
    for (const sql of dropTables) {
      await client.query(sql);
      console.log(`   ✓ ${sql.replace('DROP TABLE IF EXISTS ', '').replace(' CASCADE', '')}`);
    }
    
    console.log('\n📦 Creating new tables with correct schema...\n');
    
    // Create users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        firstname VARCHAR(255) NOT NULL,
        lastname VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        jobtitle VARCHAR(255),
        location VARCHAR(255),
        linkedin_url VARCHAR(500),
        profile_image VARCHAR(500),
        bio TEXT,
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        usertype VARCHAR(50) DEFAULT 'member',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ users table created');
    
    // Create invite_tokens table
    await client.query(`
      CREATE TABLE invite_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        created_by INTEGER REFERENCES users(id),
        used_by INTEGER REFERENCES users(id),
        is_used BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ invite_tokens table created');
    
    // Create events table
    await client.query(`
      CREATE TABLE events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        location VARCHAR(500),
        points INTEGER DEFAULT 0,
        max_attendees INTEGER,
        image_url VARCHAR(500),
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ events table created');
    
    // Create jobs table
    await client.query(`
      CREATE TABLE jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        jobtype VARCHAR(50),
        points INTEGER DEFAULT 0,
        requirements TEXT,
        benefits TEXT,
        salary_range VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        posted_by INTEGER REFERENCES users(id),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ jobs table created');
    
    // Create announcements table
    await client.query(`
      CREATE TABLE announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        featured BOOLEAN DEFAULT FALSE,
        points INTEGER DEFAULT 0,
        image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id),
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ announcements table created');
    
    // Create points_history table
    await client.query(`
      CREATE TABLE points_history (
        id SERIAL PRIMARY KEY,
        userid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points INTEGER NOT NULL,
        reason VARCHAR(500),
        type VARCHAR(50),
        referenceid INTEGER,
        referencetype VARCHAR(50),
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ points_history table created');
    
    // Create connections table
    await client.query(`
      CREATE TABLE connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        connected_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, connected_user_id)
      )
    `);
    console.log('   ✓ connections table created');
    
    // Create messages table  
    await client.query(`
      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ messages table created');
    
    // Create rewards table
    await client.query(`
      CREATE TABLE rewards (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        pointscost INTEGER NOT NULL,
        category VARCHAR(100),
        quantity INTEGER DEFAULT 1,
        isactive BOOLEAN DEFAULT TRUE,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ rewards table created');
    
    // Create reward_redemptions table
    await client.query(`
      CREATE TABLE reward_redemptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
        points_spent INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ reward_redemptions table created');
    
    // Create event_attendees table
    await client.query(`
      CREATE TABLE event_attendees (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'registered',
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        attended_at TIMESTAMP,
        UNIQUE(event_id, user_id)
      )
    `);
    console.log('   ✓ event_attendees table created');
    
    // Create job_applications table
    await client.query(`
      CREATE TABLE job_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cover_letter TEXT,
        resume_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'applied',
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, user_id)
      )
    `);
    console.log('   ✓ job_applications table created');
    
    // Create user_sessions table
    await client.query(`
      CREATE TABLE user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token VARCHAR(500) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ user_sessions table created');
    
    // Create audit_log table
    await client.query(`
      CREATE TABLE audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INTEGER,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ audit_log table created');
    
    console.log('\n📇 Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_usertype ON users (usertype)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_points_history_userid ON points_history (userid)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens (token)');
    console.log('   ✓ Indexes created');
    
    console.log('\n👤 Creating default admin user...');
    const hashedPassword = await bcrypt.hash('TempAdmin2024!', 10);
    
    await client.query(
      `INSERT INTO users (email, password, firstname, lastname, usertype, points, level) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['admin@tdil.com', hashedPassword, 'Admin', 'User', 'admin', 100, 5]
    );
    console.log('   ✓ Admin user created (admin@tdil.com / TempAdmin2024!)');
    
    // Create invite tokens for testing
    const inviteToken = crypto.randomBytes(32).toString('hex');
    await client.query(
      `INSERT INTO invite_tokens (token, created_by, is_used) VALUES ($1, 1, $2)`,
      [inviteToken, false]
    );
    console.log(`   ✓ Sample invite token created: ${inviteToken}`);
    
    console.log('\n✅ Database reset complete!');
    console.log('\n📋 Summary:');
    console.log('   - All tables dropped and recreated');
    console.log('   - Admin user: admin@tdil.com / TempAdmin2024!');
    console.log(`   - Invite token: ${inviteToken}`);
    console.log('\n🔐 Please change the admin password after logging in!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch(console.error);
