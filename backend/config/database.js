const { Pool } = require('pg');

// Conditionally import sqlite3 only for development
let sqlite3, Database;
const dbType = process.env.DB_TYPE || 'sqlite';
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction && dbType === 'sqlite') {
  try {
    sqlite3 = require('sqlite3').verbose();
    Database = require('sqlite3').Database;
  } catch (error) {
    console.log('⚠️ SQLite not available - using PostgreSQL only');
  }
}

// Database configuration
let db;
let isPostgreSQL;

const connectionString = process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING;
const sqliteDbPath = process.env.DB_PATH || './backend/database.sqlite';

console.log('🔍 Database connection debug:', {
  DB_TYPE: dbType,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  DB_PATH: sqliteDbPath,
  NODE_ENV: process.env.NODE_ENV
});

// Initialize database based on type
if (connectionString && (process.env.NODE_ENV === 'production' || dbType === 'postgresql')) {
  // PostgreSQL for production
  isPostgreSQL = true;
  db = new Pool({
    connectionString: connectionString,
    ssl: isProduction && connectionString.includes("amazonaws") ? {
      rejectUnauthorized: false
    } : false,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 10,
    statement_timeout: 30000,
    query_timeout: 30000
  });
  console.log('🐘 Using PostgreSQL database');
} else {
  // SQLite for development
  isPostgreSQL = false;
  try {
    db = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err);
        db = null;
      } else {
        console.log('📦 Using SQLite database:', sqliteDbPath);
      }
    });
  } catch (error) {
    console.error('Failed to create SQLite database:', error);
    db = null;
  }
}

// Universal query function for both PostgreSQL and SQLite
const query = async (sql, params = []) => {
  if (!db) {
    console.log('⚠️ Database query skipped - running in demo mode');
    return [];
  }
  
  try {
    if (isPostgreSQL) {
      // PostgreSQL query
      const result = await db.query(sql, params);
      return result.rows;
    } else {
      // SQLite query
      return new Promise((resolve, reject) => {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
          db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve([{ id: this.lastID }]);
          });
        } else {
          db.run(sql, params, (err) => {
            if (err) reject(err);
            else resolve([]);
          });
        }
      });
    }
  } catch (error) {
    throw error;
  }
};

// Initialize database tables using proper migration
const initDatabase = async () => {
  if (!db) {
    console.log('⚠️ No database connection - running without database (demo mode)');
    return Promise.resolve();
  }

  try {
    // Test connection first
    if (isPostgreSQL) {
      await query('SELECT 1');
    } else {
      await query('SELECT 1');
    }
    console.log('✅ Database connected successfully');

    // Define schema based on database type
    // NOTE: Using lowercase column names to match PostgreSQL identifier folding and controller queries
    const createUserTable = isPostgreSQL 
      ? `CREATE TABLE IF NOT EXISTS users (
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
        )`
      : `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          firstname TEXT NOT NULL,
          lastname TEXT NOT NULL,
          company TEXT,
          jobtitle TEXT,
          location TEXT,
          linkedin_url TEXT,
          profile_image TEXT,
          bio TEXT,
          points INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          usertype TEXT DEFAULT 'member',
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    const createPointsHistoryTable = isPostgreSQL
      ? `CREATE TABLE IF NOT EXISTS points_history (
          id SERIAL PRIMARY KEY,
          userid INTEGER NOT NULL REFERENCES users(id),
          points INTEGER NOT NULL,
          reason VARCHAR(500),
          type VARCHAR(50) DEFAULT 'earned',
          referenceid INTEGER,
          referencetype VARCHAR(50),
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      : `CREATE TABLE IF NOT EXISTS points_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userid INTEGER NOT NULL,
          points INTEGER NOT NULL,
          reason TEXT,
          type TEXT DEFAULT 'earned',
          referenceid INTEGER,
          referencetype TEXT,
          createdat DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    const createInviteTokenTable = isPostgreSQL
      ? `CREATE TABLE IF NOT EXISTS invite_tokens (
          id SERIAL PRIMARY KEY,
          token VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255),
          created_by INTEGER REFERENCES users(id),
          used_by INTEGER REFERENCES users(id),
          is_used BOOLEAN DEFAULT FALSE,
          is_reusable BOOLEAN DEFAULT FALSE,
          user_type VARCHAR(50) DEFAULT 'member',
          use_count INTEGER DEFAULT 0,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      : `CREATE TABLE IF NOT EXISTS invite_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT UNIQUE NOT NULL,
          email TEXT,
          created_by INTEGER,
          used_by INTEGER,
          is_used INTEGER DEFAULT 0,
          is_reusable INTEGER DEFAULT 0,
          user_type TEXT DEFAULT 'member',
          use_count INTEGER DEFAULT 0,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    // Create connections table
    const createConnectionsTable = isPostgreSQL
      ? `CREATE TABLE IF NOT EXISTS connections (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          connected_user_id INTEGER NOT NULL REFERENCES users(id),
          status VARCHAR(50) DEFAULT 'connected',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, connected_user_id)
        )`
      : `CREATE TABLE IF NOT EXISTS connections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          connected_user_id INTEGER NOT NULL,
          status TEXT DEFAULT 'connected',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, connected_user_id)
        )`;

    // Create events table
    const createEventsTable = isPostgreSQL
      ? `CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          date TIMESTAMP NOT NULL,
          location VARCHAR(255),
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      : `CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          date DATETIME NOT NULL,
          location TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    console.log('🔄 Creating database tables...');
    await query(createUserTable);
    await query(createPointsHistoryTable);
    await query(createInviteTokenTable);
    await query(createConnectionsTable);
    await query(createEventsTable);

    // Add missing columns to existing invite_tokens table (for production DB updates)
    if (isPostgreSQL) {
      try {
        await query('ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS is_reusable BOOLEAN DEFAULT FALSE');
        await query('ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT \'member\'');
        await query('ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0');
        console.log('✅ invite_tokens columns updated');
      } catch (err) {
        // Columns might already exist
        console.log('ℹ️ invite_tokens columns already up to date');
      }
    }

    // Create permanent reusable invite tokens if they don't exist
    console.log('🔑 Creating permanent invite tokens...');
    const permanentTokens = [
      { token: 'TDIL-MEMBER-INVITE', userType: 'member' },
      { token: 'TDIL-PARTNER-INVITE', userType: 'partner_school' },
      { token: 'TDIL-SPONSOR-INVITE', userType: 'sponsor' },
      { token: 'TDIL-ADMIN-SECURE', userType: 'admin' }
    ];

    for (const t of permanentTokens) {
      try {
        const existing = await query('SELECT id FROM invite_tokens WHERE token = $1', [t.token]);
        if (!existing || existing.length === 0) {
          if (isPostgreSQL) {
            await query(
              'INSERT INTO invite_tokens (token, user_type, is_reusable, is_used, expires_at) VALUES ($1, $2, TRUE, FALSE, NULL)',
              [t.token, t.userType]
            );
          } else {
            await query(
              'INSERT INTO invite_tokens (token, user_type, is_reusable, is_used, expires_at) VALUES (?, ?, 1, 0, NULL)',
              [t.token, t.userType]
            );
          }
          console.log(`✅ Created permanent token: ${t.token} (${t.userType})`);
        }
      } catch (err) {
        console.log(`ℹ️ Token ${t.token} already exists or error: ${err.message}`);
      }
    }

    // Insert default admin user if none exists
    const existingUsers = await query('SELECT COUNT(*) as count FROM users');
    const userCount = existingUsers[0]?.count || existingUsers[0]?.['COUNT(*)'] || 0;
    
    if (userCount === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('TempAdmin2024!', 10);
      
      console.log('👤 Creating default admin user...');
      
      if (isPostgreSQL) {
        await query(
          `INSERT INTO users (email, password, firstname, lastname, usertype, points, level) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['admin@tdil.com', hashedPassword, 'Admin', 'User', 'admin', 100, 5]
        );

        // Create a sample invite token
        const crypto = require('crypto');
        const inviteToken = crypto.randomBytes(32).toString('hex');
        await query(
          `INSERT INTO invite_tokens (token, created_by, is_used) VALUES ($1, 1, $2)`,
          [inviteToken, false]
        );
      } else {
        await query(
          `INSERT INTO users (email, password, firstname, lastname, usertype, points, level) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ['admin@tdil.com', hashedPassword, 'Admin', 'User', 'admin', 100, 5]
        );

        // Create a sample invite token
        const crypto = require('crypto');
        const inviteToken = crypto.randomBytes(32).toString('hex');
        await query(
          `INSERT INTO invite_tokens (token, created_by, is_used) VALUES (?, 1, ?)`,
          [inviteToken, 0]
        );
      }
      
      console.log(`✅ Default admin user created (admin@tdil.com / TempAdmin2024!)`);
      console.log(`✅ Sample invite token created: ${inviteToken}`);
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
