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
    } : false,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 10,
    statement_timeout: 30000,
    query_timeout: 30000
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

// Initialize database tables using proper migration
const initDatabase = async () => {
  if (!connectionString) {
    console.log('⚠️ No database connection - running without database (demo mode)');
    return Promise.resolve();
  }

  try {
    // Test connection first
    await db.query('SELECT 1');
    console.log('✅ Database connected successfully');

    // Run the proper database migration
    const fs = require('fs');
    const path = require('path');
    
    try {
      const migrationPath = path.join(__dirname, '../../database/migrations/001_create_initial_schema.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      console.log('🔄 Running database migration...');
      await db.query(migrationSQL);
      console.log('✅ Database migration completed successfully');
      
    } catch (migrationError) {
      console.log('⚠️ Migration file not found, using basic schema...');
      
      // Fallback to basic schema but with correct column names
      await db.query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        job_title VARCHAR(255),
        location VARCHAR(255),
        linkedin_url VARCHAR(500),
        profile_image VARCHAR(500),
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        user_type VARCHAR(50) DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.query(`CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date TIMESTAMP NOT NULL,
        location VARCHAR(255),
        points INTEGER DEFAULT 0,
        max_attendees INTEGER,
        image_url VARCHAR(500),
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.query(`CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        job_type VARCHAR(100),
        points INTEGER DEFAULT 0,
        requirements TEXT,
        benefits TEXT,
        salary_range VARCHAR(100),
        posted_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.query(`CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        points INTEGER DEFAULT 0,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.query(`CREATE TABLE IF NOT EXISTS rewards (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        points_cost INTEGER NOT NULL,
        category VARCHAR(100),
        quantity INTEGER DEFAULT 1,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.query(`CREATE TABLE IF NOT EXISTS points_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL,
        reason VARCHAR(500),
        type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.query(`CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        refresh_token VARCHAR(500) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    }

    console.log('✅ Database tables initialized successfully');
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
