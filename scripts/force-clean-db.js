#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const forceCleanDatabase = async () => {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ No DATABASE_URL found - cannot clean database');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🔥 FORCE CLEANING DATABASE - DELETING ALL DATA');
    
    await pool.query('BEGIN');
    
    // Delete all data from all tables
    const tables = [
      'points_history',
      'user_sessions', 
      'event_attendees',
      'job_applications',
      'reward_redemptions',
      'connections',
      'messages',
      'announcements',
      'rewards',
      'jobs',
      'events',
      'users',
      'audit_log'
    ];
    
    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table}`);
        console.log(`✅ Cleared ${table}`);
      } catch (e) {
        console.log(`⚠️ ${table} table not found or already empty`);
      }
    }
    
    // Reset sequences
    const sequences = [
      'users_id_seq',
      'events_id_seq',
      'jobs_id_seq',
      'rewards_id_seq',
      'announcements_id_seq',
      'points_history_id_seq'
    ];
    
    for (const seq of sequences) {
      try {
        await pool.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
      } catch (e) {
        console.log(`⚠️ Sequence ${seq} not found`);
      }
    }
    
    await pool.query('COMMIT');
    
    console.log('🎉 DATABASE COMPLETELY CLEANED - READY FOR REAL USERS');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Database cleaning failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  forceCleanDatabase().catch(console.error);
}

module.exports = forceCleanDatabase;
