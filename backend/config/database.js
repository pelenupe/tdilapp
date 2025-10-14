const { Pool } = require('pg');

// PostgreSQL connection for production
let db;
const isPostgreSQL = true;

// Always use PostgreSQL in production
const connectionString = process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING;
console.log('🔍 Database connection debug:', {
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  NODE_ENV: process.env.NODE_ENV,
  connectionString: connectionString ? connectionString.substring(0, 20) + '...' : 'NOT SET'
});

// Only create database pool if we have a connection string
if (connectionString) {
  db = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });
  console.log('🐘 Using PostgreSQL database (production mode)');
} else {
  db = null;
  console.log('⚠️ NO DATABASE - Running in demo mode (frontend only)');
}

// PostgreSQL query function
const query = async (sql, params = []) => {
  if (!db) {
    console.log('⚠️ Database query skipped - running in demo mode');
    return [];
  }
  try {
    const result = await db.query(sql, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// Initialize database tables (PostgreSQL syntax)
const initDatabase = async () => {
  if (!connectionString) {
    console.log('⚠️ No database connection - running without database (demo mode)');
    return Promise.resolve();
  }

  try {
    // Test connection first
    await db.query('SELECT 1');
    console.log('✅ Database connected successfully');

    // Users table
    await db.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      firstName VARCHAR(255) NOT NULL,
      lastName VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      jobTitle VARCHAR(255),
      location VARCHAR(255),
      linkedinUrl VARCHAR(500),
      profileImage VARCHAR(500),
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      userType VARCHAR(50) DEFAULT 'member',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Events table
    await db.query(`CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      date TIMESTAMP NOT NULL,
      location VARCHAR(255),
      points INTEGER DEFAULT 0,
      maxAttendees INTEGER,
      imageUrl VARCHAR(500),
      category VARCHAR(100),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Jobs table
    await db.query(`CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      description TEXT,
      location VARCHAR(255),
      jobType VARCHAR(100),
      points INTEGER DEFAULT 0,
      requirements TEXT,
      benefits TEXT,
      salaryRange VARCHAR(100),
      postedBy INTEGER REFERENCES users(id),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    console.log('🚨 Continuing without database - app will run in demo mode');
    return Promise.resolve();
  }
};

// Simple function that doesn't insert sample data - let it be handled by migrations
const insertSampleData = async () => {
  console.log('Sample data insertion skipped - handled by migrations');
  return Promise.resolve();
};

module.exports = {
  db,
  query,
  isPostgreSQL,
  initDatabase,
  insertSampleData
};
