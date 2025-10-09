#!/usr/bin/env node

const { Pool } = require('pg');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

class BackupManager {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
    
    this.backupDir = process.env.BACKUP_DIR || '/app/backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 50;
  }

  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      try {
        await fs.mkdir(this.backupDir, { recursive: true });
        console.log(`✅ Created backup directory: ${this.backupDir}`);
      } catch (mkdirError) {
        console.error(`❌ Failed to create backup directory: ${mkdirError.message}`);
        throw mkdirError;
      }
    }
  }

  async createDatabaseBackup() {
    try {
      await this.ensureBackupDirectory();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `tdil_backup_${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupFileName);
      const compressedPath = `${backupPath}.gz`;
      
      console.log(`🔄 Creating database backup: ${backupFileName}`);
      
      // Parse database URL
      const dbUrl = new URL(process.env.DATABASE_URL);
      const dbConfig = {
        host: dbUrl.hostname,
        port: dbUrl.port || 5432,
        database: dbUrl.pathname.slice(1),
        username: dbUrl.username,
        password: dbUrl.password
      };
      
      // Create backup using pg_dump
      const pgDumpCommand = [
        'pg_dump',
        '--host', dbConfig.host,
        '--port', dbConfig.port.toString(),
        '--username', dbConfig.username,
        '--dbname', dbConfig.database,
        '--verbose',
        '--clean',
        '--no-owner',
        '--no-privileges',
        '--format', 'plain',
        '--file', backupPath
      ];
      
      // Set password environment variable
      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      
      const pgDump = spawn(pgDumpCommand[0], pgDumpCommand.slice(1), {
        env,
        stdio: ['inherit', 'pipe', 'pipe']
      });
      
      let pgDumpOutput = '';
      let pgDumpError = '';
      
      pgDump.stdout.on('data', (data) => {
        pgDumpOutput += data.toString();
      });
      
      pgDump.stderr.on('data', (data) => {
        pgDumpError += data.toString();
      });
      
      await new Promise((resolve, reject) => {
        pgDump.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`pg_dump failed with code ${code}: ${pgDumpError}`));
          }
        });
      });
      
      // Compress the backup file
      console.log(`🔄 Compressing backup file...`);
      await this.compressFile(backupPath, compressedPath);
      
      // Remove uncompressed file
      await fs.unlink(backupPath);
      
      // Get backup file size
      const stats = await fs.stat(compressedPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ Database backup completed: ${backupFileName}.gz (${sizeInMB} MB)`);
      
      // Create backup metadata
      const metadata = {
        filename: `${backupFileName}.gz`,
        timestamp: new Date().toISOString(),
        size: stats.size,
        sizeMB: parseFloat(sizeInMB),
        database: dbConfig.database,
        type: 'full',
        compressed: true
      };
      
      const metadataPath = path.join(this.backupDir, `${backupFileName}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      return {
        success: true,
        filename: `${backupFileName}.gz`,
        path: compressedPath,
        metadata
      };
      
    } catch (error) {
      console.error('❌ Database backup failed:', error.message);
      throw error;
    }
  }

  async compressFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const gzip = spawn('gzip', ['-c', inputPath]);
      const output = require('fs').createWriteStream(outputPath);
      
      gzip.stdout.pipe(output);
      
      gzip.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Compression failed with code ${code}`));
        }
      });
      
      gzip.on('error', reject);
      output.on('error', reject);
    });
  }

  async restoreDatabase(backupPath) {
    try {
      console.log(`🔄 Restoring database from: ${backupPath}`);
      
      // Check if backup file exists
      await fs.access(backupPath);
      
      // Parse database URL
      const dbUrl = new URL(process.env.DATABASE_URL);
      const dbConfig = {
        host: dbUrl.hostname,
        port: dbUrl.port || 5432,
        database: dbUrl.pathname.slice(1),
        username: dbUrl.username,
        password: dbUrl.password
      };
      
      // Decompress if needed
      let sqlFilePath = backupPath;
      if (backupPath.endsWith('.gz')) {
        console.log('🔄 Decompressing backup file...');
        sqlFilePath = backupPath.replace('.gz', '');
        await this.decompressFile(backupPath, sqlFilePath);
      }
      
      // Restore using psql
      const psqlCommand = [
        'psql',
        '--host', dbConfig.host,
        '--port', dbConfig.port.toString(),
        '--username', dbConfig.username,
        '--dbname', dbConfig.database,
        '--file', sqlFilePath
      ];
      
      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      
      const psql = spawn(psqlCommand[0], psqlCommand.slice(1), {
        env,
        stdio: ['inherit', 'pipe', 'pipe']
      });
      
      let psqlOutput = '';
      let psqlError = '';
      
      psql.stdout.on('data', (data) => {
        psqlOutput += data.toString();
      });
      
      psql.stderr.on('data', (data) => {
        psqlError += data.toString();
      });
      
      await new Promise((resolve, reject) => {
        psql.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Database restore failed with code ${code}: ${psqlError}`));
          }
        });
      });
      
      // Clean up decompressed file if we created it
      if (backupPath.endsWith('.gz') && sqlFilePath !== backupPath) {
        await fs.unlink(sqlFilePath);
      }
      
      console.log('✅ Database restore completed successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Database restore failed:', error.message);
      throw error;
    }
  }

  async decompressFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const gunzip = spawn('gunzip', ['-c', inputPath]);
      const output = require('fs').createWriteStream(outputPath);
      
      gunzip.stdout.pipe(output);
      
      gunzip.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Decompression failed with code ${code}`));
        }
      });
      
      gunzip.on('error', reject);
      output.on('error', reject);
    });
  }

  async listBackups() {
    try {
      await this.ensureBackupDirectory();
      
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.sql.gz'));
      
      const backups = [];
      
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const metadataPath = path.join(this.backupDir, `${file.replace('.gz', '')}.meta.json`);
        
        const stats = await fs.stat(filePath);
        let metadata = {
          filename: file,
          timestamp: stats.mtime.toISOString(),
          size: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
        };
        
        // Try to load metadata file
        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          metadata = { ...metadata, ...JSON.parse(metadataContent) };
        } catch (error) {
          // Metadata file doesn't exist, use file stats
        }
        
        backups.push(metadata);
      }
      
      // Sort by timestamp, newest first
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return backups;
    } catch (error) {
      console.error('Failed to list backups:', error.message);
      throw error;
    }
  }

  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      console.log(`📋 Found ${backups.length} backup files`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      let deletedCount = 0;
      let deletedSize = 0;
      
      for (const backup of backups) {
        const backupDate = new Date(backup.timestamp);
        const shouldDelete = backupDate < cutoffDate || backups.indexOf(backup) >= this.maxBackups;
        
        if (shouldDelete) {
          const backupPath = path.join(this.backupDir, backup.filename);
          const metadataPath = path.join(this.backupDir, `${backup.filename.replace('.gz', '')}.meta.json`);
          
          try {
            await fs.unlink(backupPath);
            deletedSize += backup.size;
            deletedCount++;
            
            // Also delete metadata file
            try {
              await fs.unlink(metadataPath);
            } catch (error) {
              // Metadata file might not exist
            }
            
            console.log(`🗑️  Deleted old backup: ${backup.filename}`);
          } catch (error) {
            console.error(`Failed to delete backup ${backup.filename}:`, error.message);
          }
        }
      }
      
      if (deletedCount > 0) {
        const deletedSizeMB = (deletedSize / (1024 * 1024)).toFixed(2);
        console.log(`✅ Cleanup completed: ${deletedCount} files deleted (${deletedSizeMB} MB freed)`);
      } else {
        console.log('✅ No old backups to clean up');
      }
      
      return {
        deletedCount,
        deletedSize,
        remainingBackups: backups.length - deletedCount
      };
    } catch (error) {
      console.error('Backup cleanup failed:', error.message);
      throw error;
    }
  }

  async setupScheduledBackups() {
    const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
    
    console.log(`📅 Setting up scheduled backups with cron: ${schedule}`);
    
    cron.schedule(schedule, async () => {
      try {
        console.log('🔄 Starting scheduled backup...');
        await this.createDatabaseBackup();
        await this.cleanupOldBackups();
        console.log('✅ Scheduled backup completed');
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error.message);
      }
    });
    
    console.log('✅ Scheduled backups configured');
  }

  async validateBackup(backupPath) {
    try {
      // Basic file existence and size check
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }
      
      // For compressed files, try to decompress a small portion
      if (backupPath.endsWith('.gz')) {
        const testDecompression = spawn('gunzip', ['-t', backupPath]);
        
        await new Promise((resolve, reject) => {
          testDecompression.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error('Backup file is corrupted (failed gzip test)'));
            }
          });
        });
      }
      
      console.log(`✅ Backup validation passed: ${backupPath}`);
      return { valid: true, size: stats.size };
    } catch (error) {
      console.error(`❌ Backup validation failed: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const backupManager = new BackupManager();
  const command = process.argv[2];
  const argument = process.argv[3];
  
  try {
    switch (command) {
      case 'backup':
        const result = await backupManager.createDatabaseBackup();
        console.log('Backup result:', result);
        break;
        
      case 'restore':
        if (!argument) {
          console.error('Usage: node backup-restore.js restore <backup-file-path>');
          process.exit(1);
        }
        await backupManager.restoreDatabase(argument);
        break;
        
      case 'list':
        const backups = await backupManager.listBackups();
        console.log('\n📋 Available backups:');
        console.table(backups);
        break;
        
      case 'cleanup':
        await backupManager.cleanupOldBackups();
        break;
        
      case 'validate':
        if (!argument) {
          console.error('Usage: node backup-restore.js validate <backup-file-path>');
          process.exit(1);
        }
        await backupManager.validateBackup(argument);
        break;
        
      case 'schedule':
        await backupManager.setupScheduledBackups();
        // Keep the process running
        console.log('📅 Backup scheduler is running. Press Ctrl+C to stop.');
        break;
        
      default:
        console.log('Available commands:');
        console.log('  backup           - Create a database backup');
        console.log('  restore <file>   - Restore from backup file');
        console.log('  list            - List all available backups');
        console.log('  cleanup         - Remove old backups based on retention policy');
        console.log('  validate <file> - Validate backup file integrity');
        console.log('  schedule        - Start backup scheduler (runs continuously)');
        break;
    }
  } catch (error) {
    console.error('Command failed:', error.message);
    process.exit(1);
  } finally {
    if (command !== 'schedule') {
      await backupManager.pool.end();
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BackupManager;
