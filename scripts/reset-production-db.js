#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const resetProductionDatabase = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🔥 RESETTING PRODUCTION DATABASE - REMOVING ALL DEMO DATA');
    
    await pool.query('BEGIN');
    
    // Delete all demo data
    await pool.query('DELETE FROM points_history');
    await pool.query('DELETE FROM announcements');
    await pool.query('DELETE FROM rewards');
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM events');
    await pool.query('DELETE FROM jobs');
    
    console.log('✅ All demo data removed');
    
    // Reset sequences
    await pool.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE rewards_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE announcements_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE events_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE jobs_id_seq RESTART WITH 1');
    
    console.log('✅ Database sequences reset');
    
    await pool.query('COMMIT');
    
    console.log('🎉 DATABASE RESET COMPLETE - Ready for real users!');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Database reset failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  resetProductionDatabase().catch(console.error);
}

module.exports = resetProductionDatabase;
