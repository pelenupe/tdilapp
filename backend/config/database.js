const { Pool } = require('pg');

// PostgreSQL connection for production
let db;
const isPostgreSQL = true;

// Always use PostgreSQL in production
db = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

console.log('🐘 Using PostgreSQL database (production mode)');

// PostgreSQL query function
const query = async (sql, params = []) => {
  try {
    const result = await db.query(sql, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// Initialize database tables (PostgreSQL syntax)
const initDatabase = async () => {
  try {
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

    // Announcements table
    await db.query(`CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(100),
      featured BOOLEAN DEFAULT FALSE,
      points INTEGER DEFAULT 0,
      imageUrl VARCHAR(500),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Other tables...
    await db.query(`CREATE TABLE IF NOT EXISTS points_history (
      id SERIAL PRIMARY KEY,
      userId INTEGER NOT NULL REFERENCES users(id),
      points INTEGER NOT NULL,
      reason TEXT,
      type VARCHAR(100),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
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
