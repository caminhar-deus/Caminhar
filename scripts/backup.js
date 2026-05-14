import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import zlib from 'zlib';
import { exec } from 'child_process';
import { createSqliteBackup } from './backup-sqlite.js';

// Database and backup paths
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');
const LOG_FILE = path.join(process.cwd(), 'data', 'backups', 'backup.log');

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
 * Generate backup filename with ISO 8601 timestamp (padronizado)
 */
function generateBackupFilename() {
  const timestamp = format(new Date(), "yyyy-MM-dd'T'HH-mm-ss'Z'");
  return `${BACKUP_CONFIG.backupPrefix}_${timestamp}.sql.gz`;
}

/**
 * Create a backup of both PostgreSQL and SQLite databases
 */
async function createBackup() {
  try {
    console.log('Starting database backup...');

    // Ensure backup directory exists
    await ensureBackupDirectory();

    // ===== Backup PostgreSQL (existente) =====
    console.log('--- Iniciando backup PostgreSQL ---');
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

    // Calcular hash SHA-256 do arquivo de backup
    const crypto = await import('crypto');
    const fileBuffer = fs.readFileSync(backupPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    fs.writeFileSync(`${backupPath}.sha256`, hash);

    // ✅ Criptografia em repouso AES-256-GCM
    if (process.env.BACKUP_ENCRYPTION_KEY) {
      try {
        const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        const encrypted = Buffer.concat([
          iv, 
          cipher.update(fileBuffer), 
          cipher.final(), 
          cipher.getAuthTag()
        ]);
        
        fs.writeFileSync(`${backupPath}.enc`, encrypted);
        fs.unlinkSync(backupPath);
        
        console.log(`✅ Backup criptografado com sucesso: ${backupPath}.enc`);
        
      } catch (cryptoError) {
        console.error('⚠️ Erro ao criptografar backup, mantendo arquivo original:', cryptoError.message);
      }
    }

    // Log the backup operation
    await logBackupOperation('SUCCESS', `[PostgreSQL] ${backupFilename} | hash: ${hash.substring(0, 12)}...`);

    // ===== Backup SQLite (nova funcionalidade) =====
    try {
      console.log('\n--- Iniciando backup SQLite (acoplado) ---');
      await createSqliteBackup();
      console.log('--- Backup SQLite concluído ---\n');
    } catch (sqliteError) {
      console.error('⚠️ Backup SQLite falhou (não crítico):', sqliteError.message);
      await logBackupOperation('ERROR', `[SQLite] Backup failed (non-critical): ${sqliteError.message}`);
    }

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
 * Log backup operations (com sanitização)
 */
async function logBackupOperation(status, message) {
  try {
    // Sanitiza a mensagem: remove possíveis dados sensíveis
    const sanitizedMessage = message
      .replace(/(password|senha|token|secret|key|chave)\s*[=:]\s*\S+/gi, '$1=***')
      .replace(/(DATABASE_URL|JWT_SECRET|ADMIN_PASSWORD|BACKUP_ENCRYPTION_KEY)\s*=\s*\S+/g, '$1=***')
      .replace(/pg_dump\s+"[^"]+"/g, 'pg_dump "***"')
      .replace(/psql\s+"[^"]+"/g, 'psql "***"');

    const logEntry = `[${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] [${status}] ${sanitizedMessage}\n`;

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
      .filter(file => file.startsWith(BACKUP_CONFIG.backupPrefix) && (file.endsWith('.sql.gz') || file.endsWith('.enc')))
      .map(file => file.replace('.enc', ''))
      .filter((file, index, self) => self.indexOf(file) === index) // Remove duplicatas
      .sort((a, b) => {
        // Sort by ISO 8601 timestamp (newest first)
        const timestampA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/)?.[0];
        const timestampB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/)?.[0];
        if (!timestampA && !timestampB) return 0;
        if (!timestampA) return 1;
        if (!timestampB) return -1;
        return timestampB.localeCompare(timestampA);
      });

    // Remove backups exceeding the maximum count
    if (files.length > BACKUP_CONFIG.maxBackups) {
      const filesToRemove = files.slice(BACKUP_CONFIG.maxBackups);

      for (const file of filesToRemove) {
        const filePath = path.join(BACKUP_DIR, file);
        const encPath = `${filePath}.enc`;
        const hashPath = `${filePath}.sha256`;
        
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
        if (fs.existsSync(hashPath)) fs.unlinkSync(hashPath);
        
        console.log(`Removed old backup: ${file}`);
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
    let backupPath = path.join(BACKUP_DIR, backupFilename);
    
    // Se usuário passou arquivo .enc, ajustar o nome base
    if (backupFilename.endsWith('.enc')) {
      backupFilename = backupFilename.replace('.enc', '');
      backupPath = path.join(BACKUP_DIR, backupFilename);
    }

    if (!fs.existsSync(backupPath) && !fs.existsSync(`${backupPath}.enc`)) {
      throw new Error(`Backup file not found: ${backupFilename}`);
    }

    // 1. Create a safety backup before overwriting
    console.log('🔄 Criando um backup de segurança do banco de dados atual...');
    const safetyBackupFilename = `pre-restore-backup_${format(new Date(), "yyyy-MM-dd'T'HH-mm-ss'Z'")}.sql.gz`;
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

    // ✅ Verificar integridade do backup antes de restaurar
    const crypto = await import('crypto');
    const hashPath = `${backupPath}.sha256`;
    
    // ✅ Descriptografar backup se estiver criptografado
    if (process.env.BACKUP_ENCRYPTION_KEY && !fs.existsSync(backupPath) && fs.existsSync(`${backupPath}.enc`)) {
      try {
        console.log('🔓 Descriptografando backup...');
        
        const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
        const encrypted = fs.readFileSync(`${backupPath}.enc`);
        
        const iv = encrypted.subarray(0, 12);
        const authTag = encrypted.subarray(encrypted.length - 16);
        const ciphertext = encrypted.subarray(12, encrypted.length - 16);
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        fs.writeFileSync(backupPath, decrypted);
        
        console.log('✅ Backup descriptografado com sucesso.');
        
      } catch (cryptoError) {
        throw new Error(`❌ Falha ao descriptografar backup: ${cryptoError.message}`);
      }
    }
    
    if (fs.existsSync(hashPath)) {
      console.log('🔍 Verificando integridade do backup...');
      
      const expectedHash = fs.readFileSync(hashPath, 'utf8').trim();
      const fileBuffer = fs.readFileSync(backupPath);
      const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      if (expectedHash !== actualHash) {
        throw new Error(`❌ BACKUP CORROMPIDO! Hash não confere.\nEsperado: ${expectedHash}\nRecebido: ${actualHash}`);
      }
      
      console.log('✅ Integridade do backup verificada com sucesso.');
    } else {
      console.warn('⚠️ Arquivo de hash não encontrado. Continuando sem verificação de integridade.');
    }

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

    await logBackupOperation('RESTORE_SUCCESS', `[PostgreSQL] Banco de dados restaurado de ${backupFilename}`);
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
      .filter(file => file.startsWith(BACKUP_CONFIG.backupPrefix) && (file.endsWith('.sql.gz') || file.endsWith('.enc')))
      .map(file => file.replace('.enc', ''))
      .filter((file, index, self) => self.indexOf(file) === index) // Remove duplicatas
      .sort((a, b) => {
        // Sort by ISO 8601 timestamp (newest first)
        const timestampA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/)?.[0];
        const timestampB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/)?.[0];
        if (!timestampA && !timestampB) return 0;
        if (!timestampA) return 1;
        if (!timestampB) return -1;
        return timestampB.localeCompare(timestampA);
      })
      .map(file => {
        const timestampMatch = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/);
        const timestamp = timestampMatch ? timestampMatch[0] : 'unknown';
        const formattedDate = timestamp.replace('T', ' ');
        return {
          filename: file,
          timestamp: formattedDate.replace(/-(\d{2})Z$/, '-$1'),
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
  cleanupOldBackups,
  getAvailableBackups,
  getBackupLogs,
  initializeBackupSystem,
  startBackupScheduler
};