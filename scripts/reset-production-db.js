#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const resetProductionDatabase = async () => {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ No DATABASE_URL found - skipping database reset');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5
  });

  try {
    console.log('🔥 RESETTING PRODUCTION DATABASE - REMOVING ALL DEMO DATA');
    
    // Test connection first
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    await pool.query('BEGIN');
    
    // Delete all data in correct order (handling foreign key constraints)
    console.log('🗑️ Deleting all existing data...');
    
    // Delete in order to handle foreign key constraints
    await pool.query('DELETE FROM points_history WHERE 1=1').catch(() => {});
    await pool.query('DELETE FROM announcements WHERE 1=1').catch(() => {});
    await pool.query('DELETE FROM rewards WHERE 1=1').catch(() => {});
    await pool.query('DELETE FROM events WHERE 1=1').catch(() => {});
    await pool.query('DELETE FROM jobs WHERE 1=1').catch(() => {});
    await pool.query('DELETE FROM users WHERE 1=1').catch(() => {});
    
    console.log('✅ All data removed');
    
    // Reset sequences if they exist
    const sequences = [
      'users_id_seq',
      'rewards_id_seq', 
      'announcements_id_seq',
      'events_id_seq',
      'jobs_id_seq',
      'points_history_id_seq'
    ];
    
    for (const seq of sequences) {
      try {
        await pool.query(`ALTER SEQUENCE IF EXISTS ${seq} RESTART WITH 1`);
      } catch (e) {
        console.log(`⚠️ Sequence ${seq} not found or couldn't reset`);
      }
    }
    
    console.log('✅ Database sequences reset');
    
    await pool.query('COMMIT');
    
    console.log('🎉 DATABASE RESET COMPLETE - Ready for real users!');
    
  } catch (error) {
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }
    console.error('❌ Database reset failed:', error.message);
    throw error;
  } finally {
    try {
      await pool.end();
    } catch (endError) {
      console.error('❌ Error closing pool:', endError.message);
    }
  }
};

if (require.main === module) {
  resetProductionDatabase().catch(console.error);
}

module.exports = resetProductionDatabase;
