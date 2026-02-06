import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';
import zlib from 'zlib';
import { exec } from 'child_process';

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = path.dirname(currentFilename);

// Database and backup paths
const BACKUP_DIR = path.join(currentDirname, '..', 'data', 'backups');
const LOG_FILE = path.join(currentDirname, '..', 'data', 'backups', 'backup.log');

// Backup configuration
const BACKUP_CONFIG = {
  maxBackups: 10, // Maximum number of backups to keep
  backupInterval: '0 2 * * *', // Daily at 2 AM (cron format)
  backupPrefix: 'caminhar-pg-backup'
};

/**
 * Ensure backup directory exists
 */
async function ensureBackupDirectory() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`Created backup directory: ${BACKUP_DIR}`);
    }
  } catch (error) {
    console.error('Error creating backup directory:', error);
    throw error;
  }
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename() {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  return `${BACKUP_CONFIG.backupPrefix}_${timestamp}.sql.gz`;
}

/**
 * Create a backup of the database
 */
async function createBackup() {
  try {
    console.log('Starting database backup...');

    // Ensure backup directory exists
    await ensureBackupDirectory();

    const backupFilename = generateBackupFilename();
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // Use pg_dump to create a compressed backup
    // This requires pg_dump to be in the system's PATH
    // and DATABASE_URL to be set in the environment.
    const command = `pg_dump "${process.env.DATABASE_URL}" | gzip > "${backupPath}"`;

    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`pg_dump error: ${stderr}`);
          return reject(error);
        }
        console.log(`PostgreSQL backup created: ${backupPath}`);
        resolve(stdout);
      });
    });

    // Log the backup operation
    await logBackupOperation('SUCCESS', backupFilename);

    // Clean up old backups
    await cleanupOldBackups();

    console.log('Database backup completed successfully');
    return backupPath;
  } catch (error) {
    console.error('Error creating backup:', error);
    await logBackupOperation('ERROR', error.message);
    throw error;
  }
}

/**
 * Log backup operations
 */
async function logBackupOperation(status, message) {
  try {
    const logEntry = `[${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] [${status}] ${message}\n`;

    // Append to log file
    fs.appendFileSync(LOG_FILE, logEntry);

    // Also keep last 100 lines in memory for quick access
    const logLines = fs.readFileSync(LOG_FILE, 'utf8').split('\n');
    const recentLogs = logLines.slice(-100).join('\n');
    fs.writeFileSync(LOG_FILE, recentLogs);
  } catch (error) {
    console.error('Error logging backup operation:', error);
  }
}

/**
 * Clean up old backups
 */
async function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith(BACKUP_CONFIG.backupPrefix) && file.endsWith('.sql.gz'))
      .sort((a, b) => {
        // Sort by timestamp in filename (newest first)
        const timestampA = a.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/)?.[0];
        const timestampB = b.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/)?.[0];
        return timestampB.localeCompare(timestampA);
      });

    // Remove backups exceeding the maximum count
    if (files.length > BACKUP_CONFIG.maxBackups) {
      const filesToRemove = files.slice(BACKUP_CONFIG.maxBackups);

      for (const file of filesToRemove) {
        const filePath = path.join(BACKUP_DIR, file);
        fs.unlinkSync(filePath);
        console.log(`Removed old backup: ${filePath}`);
        await logBackupOperation('INFO', `Removed old backup: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
    await logBackupOperation('ERROR', `Cleanup failed: ${error.message}`);
  }
}

/**
 * Restore database from backup
 */
async function restoreBackup(backupFilename) {
  try {
    await ensureBackupDirectory();
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupFilename}`);
    }

    // 1. Create a safety backup before overwriting
    console.log('🔄 Criando um backup de segurança do banco de dados atual...');
    const safetyBackupFilename = `pre-restore-backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.sql.gz`;
    const safetyBackupPath = path.join(BACKUP_DIR, safetyBackupFilename);
    const backupCommand = `pg_dump "${process.env.DATABASE_URL}" | gzip > "${safetyBackupPath}"`;

    await new Promise((resolve, reject) => {
      exec(backupCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Erro ao criar backup de segurança: ${stderr}`);
          return reject(new Error('Falha ao criar o backup de segurança. Restauração abortada.'));
        }
        console.log(`✅ Backup de segurança criado: ${safetyBackupFilename}`);
        resolve(stdout);
      });
    });

    // 2. Proceed with the restore
    console.log(`🔄 Restaurando banco de dados a partir de ${backupFilename}...`);
    console.warn('⚠️ ATENÇÃO: Esta operação irá sobrescrever o banco de dados atual.');

    const restoreCommand = `gunzip < "${backupPath}" | psql "${process.env.DATABASE_URL}"`;

    await new Promise((resolve, reject) => {
      exec(restoreCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Erro no psql: ${stderr}`);
          return reject(error);
        }
        console.log(`✅ Banco de dados PostgreSQL restaurado de: ${backupPath}`);
        resolve(stdout);
      });
    });

    await logBackupOperation('RESTORE_SUCCESS', `Banco de dados restaurado de ${backupFilename}`);
    return true;

  } catch (error) {
    console.error('❌ Erro ao restaurar o backup:', error);
    await logBackupOperation('RESTORE_ERROR', error.message);
    throw error;
  }
}

/**
 * Get list of available backups
 */
async function getAvailableBackups() {
  try {
    await ensureBackupDirectory();

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith(BACKUP_CONFIG.backupPrefix) && file.endsWith('.sql.gz'))
      .sort((a, b) => {
        // Sort by timestamp in filename (newest first)
        const timestampA = a.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/)?.[0];
        const timestampB = b.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/)?.[0];
        return timestampB.localeCompare(timestampA);
      })
      .map(file => {
        const timestampMatch = file.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
        const timestamp = timestampMatch ? timestampMatch[0] : 'unknown';
        const formattedDate = timestamp.replace('_', ' ');
        return {
          filename: file,
          timestamp: formattedDate,
          size: fs.statSync(path.join(BACKUP_DIR, file)).size,
          compressed: true
        };
      });

    return files;
  } catch (error) {
    console.error('Error getting available backups:', error);
    throw error;
  }
}

/**
 * Get backup logs
 */
async function getBackupLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }

    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim() !== '');

    return logLines.map(line => {
      const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] (.*)/);
      if (match) {
        return {
          timestamp: match[1],
          status: match[2],
          message: match[3]
        };
      }
      return null;
    }).filter(entry => entry !== null);
  } catch (error) {
    console.error('Error reading backup logs:', error);
    throw error;
  }
}

/**
 * Initialize backup system
 */
async function initializeBackupSystem() {
  try {
    console.log('Initializing backup system...');

    // Ensure backup directory exists
    await ensureBackupDirectory();

    // Create initial backup
    await createBackup();

    console.log('Backup system initialized');
  } catch (error) {
    console.error('Error initializing backup system:', error);
    throw error;
  }
}

/**
 * Start automated backup scheduler
 */
function startBackupScheduler() {
  try {
    console.log(`Starting backup scheduler with cron pattern: ${BACKUP_CONFIG.backupInterval}`);

    // Parse cron pattern and set up interval
    const cronParts = BACKUP_CONFIG.backupInterval.split(' ');
    if (cronParts.length === 5) {
      // Simple daily backup at specified hour
      const [minute, hour] = cronParts.slice(0, 2).map(Number);

      // Calculate milliseconds until next scheduled backup
      const now = new Date();
      const nextBackup = new Date(now);

      // Set to next occurrence of the scheduled time
      nextBackup.setHours(hour, minute, 0, 0);

      if (nextBackup <= now) {
        nextBackup.setDate(nextBackup.getDate() + 1); // Tomorrow
      }

      const initialDelay = nextBackup - now;

      // Set up the scheduler
      setTimeout(() => {
        createBackup().then(() => {
          // Set up daily interval (24 hours)
          setInterval(() => {
            createBackup().catch(console.error);
          }, 24 * 60 * 60 * 1000);
        }).catch(console.error);
      }, initialDelay);

      console.log(`Next backup scheduled for: ${nextBackup}`);
      console.log(`Backup scheduler started successfully`);
    }
  } catch (error) {
    console.error('Error starting backup scheduler:', error);
    throw error;
  }
}

// Export functions for use in other modules
export {
  createBackup,
  restoreBackup,
  getAvailableBackups,
  getBackupLogs,
  initializeBackupSystem,
  startBackupScheduler
};
