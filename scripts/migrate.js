const { Pool } = require('pg');
const { initDatabase } = require('../backend/config/database');

async function migrate() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Check if we're using PostgreSQL or SQLite
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql://')) {
      console.log('📊 Using PostgreSQL database...');
      await migratePostgreSQL();
    } else {
      console.log('📊 Using SQLite database...');
      await migrateSQLite();
    }
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

async function migratePostgreSQL() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connection established');

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(255) NOT NULL,
        "lastName" VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        "jobTitle" VARCHAR(255),
        location VARCHAR(255),
        "linkedinUrl" VARCHAR(255),
        "profileImage" VARCHAR(255),
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        "userType" VARCHAR(50) DEFAULT 'member',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL,
        location VARCHAR(255),
        points INTEGER DEFAULT 0,
        "maxAttendees" INTEGER,
        "imageUrl" VARCHAR(255),
        category VARCHAR(100),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        "jobType" VARCHAR(100),
        points INTEGER DEFAULT 0,
        requirements TEXT,
        benefits TEXT,
        "salaryRange" VARCHAR(100),
        "postedBy" INTEGER REFERENCES users(id),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        featured BOOLEAN DEFAULT false,
        points INTEGER DEFAULT 0,
        "imageUrl" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS points_history (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL,
        reason TEXT,
        type VARCHAR(100),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rewards (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        "pointsCost" INTEGER NOT NULL,
        category VARCHAR(100),
        quantity INTEGER DEFAULT 1,
        "isActive" BOOLEAN DEFAULT true,
        "imageUrl" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        "senderId" INTEGER NOT NULL REFERENCES users(id),
        "receiverId" INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ PostgreSQL tables created successfully');
    
  } finally {
    await pool.end();
  }
}

async function migrateSQLite() {
  // Use the existing SQLite initialization
  await initDatabase();
  console.log('✅ SQLite database initialized successfully');
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;
