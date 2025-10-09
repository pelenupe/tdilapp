#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class DatabaseMigrator {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
  }

  async connect() {
    try {
      await this.pool.connect();
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      process.exit(1);
    }
  }

  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    try {
      await this.pool.query(sql);
      console.log('✅ Migrations table ready');
    } catch (error) {
      console.error('❌ Failed to create migrations table:', error.message);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const result = await this.pool.query('SELECT filename FROM migrations ORDER BY id');
      return result.rows.map(row => row.filename);
    } catch (error) {
      console.error('❌ Failed to get executed migrations:', error.message);
      throw error;
    }
  }

  async getMigrationFiles() {
    try {
      const migrationsDir = path.join(__dirname, '../database/migrations');
      const files = await fs.readdir(migrationsDir);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      console.error('❌ Failed to read migration files:', error.message);
      throw error;
    }
  }

  async executeMigration(filename) {
    try {
      const migrationPath = path.join(__dirname, '../database/migrations', filename);
      const sql = await fs.readFile(migrationPath, 'utf8');
      
      console.log(`🔄 Executing migration: ${filename}`);
      
      await this.pool.query('BEGIN');
      
      // Execute the migration SQL
      await this.pool.query(sql);
      
      // Record the migration as executed
      await this.pool.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      await this.pool.query('COMMIT');
      console.log(`✅ Migration completed: ${filename}`);
      
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`❌ Migration failed: ${filename}`, error.message);
      throw error;
    }
  }

  async runMigrations() {
    try {
      await this.connect();
      await this.createMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }
      
      console.log(`📦 Found ${pendingMigrations.length} pending migrations`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('🎉 All migrations completed successfully');
      
    } catch (error) {
      console.error('❌ Migration process failed:', error.message);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async seedDatabase() {
    try {
      console.log('🌱 Seeding database with initial data...');
      
      // Check if users already exist
      const userCount = await this.pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) > 0) {
        console.log('✅ Database already contains data, skipping seed');
        return;
      }
      
      // Read and execute seed file
      const seedPath = path.join(__dirname, '../database/seeds/001_initial_data.sql');
      const seedSql = await fs.readFile(seedPath, 'utf8');
      
      await this.pool.query('BEGIN');
      await this.pool.query(seedSql);
      await this.pool.query('COMMIT');
      
      console.log('✅ Database seeded successfully');
      
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const migrator = new DatabaseMigrator();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      await migrator.runMigrations();
      break;
    case 'seed':
      await migrator.connect();
      await migrator.seedDatabase();
      await migrator.pool.end();
      break;
    case 'reset':
      console.log('⚠️  This will drop all tables and recreate them');
      // Add confirmation prompt in real implementation
      await migrator.connect();
      await migrator.pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      await migrator.runMigrations();
      await migrator.seedDatabase();
      await migrator.pool.end();
      break;
    default:
      console.log('Usage:');
      console.log('  node migrate-production.js migrate  - Run pending migrations');
      console.log('  node migrate-production.js seed     - Seed database with initial data');
      console.log('  node migrate-production.js reset    - Drop all tables and recreate');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseMigrator;
