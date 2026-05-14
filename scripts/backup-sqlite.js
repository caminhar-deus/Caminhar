import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import zlib from 'zlib';
import { execSync } from 'child_process';

// Paths
const SQLITE_DB = path.join(process.cwd(), 'data', 'caminhar.db');
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');
const LOG_FILE = path.join(process.cwd(), 'data', 'backups', 'backup.log');

// Backup configuration
const BACKUP_CONFIG = {
  maxBackups: 10,
  backupPrefix: 'caminhar-sqlite-backup'
};

/**
 * Ensure backup directory exists
 */
function ensureBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

/**
 * Generate backup filename with ISO 8601 timestamp
 */
function generateBackupFilename() {
  const timestamp = format(new Date(), "yyyy-MM-dd'T'HH-mm-ss'Z'");
  return `${BACKUP_CONFIG.backupPrefix}_${timestamp}.sql.gz`;
}

/**
 * Create a backup of the SQLite database
 */
export async function createSqliteBackup() {
  try {
    console.log('Starting SQLite database backup...');

    // Ensure backup directory exists
    ensureBackupDirectory();

    // Verifica se o banco SQLite existe
    if (!fs.existsSync(SQLITE_DB)) {
      throw new Error(`SQLite database not found at: ${SQLITE_DB}`);
    }

    const backupFilename = generateBackupFilename();
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // 1. Gera dump SQL do SQLite
    const dumpPath = backupPath.replace('.sql.gz', '.sql');
    console.log(`   Gerando dump SQL do SQLite...`);
    
    execSync(`sqlite3 "${SQLITE_DB}" .dump > "${dumpPath}"`, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 2. Comprime o dump
    console.log(`   Comprimindo dump...`);
    const fileContent = fs.readFileSync(dumpPath);
    const compressed = zlib.gzipSync(fileContent);
    fs.writeFileSync(backupPath, compressed);

    // 3. Remove o arquivo .sql temporário
    fs.unlinkSync(dumpPath);

    // 4. Calcular hash SHA-256
    const crypto = await import('crypto');
    const fileBuffer = fs.readFileSync(backupPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    fs.writeFileSync(`${backupPath}.sha256`, hash);

    console.log(`✅ SQLite backup created: ${backupFilename}`);
    
    // Log the backup operation
    await logBackupOperation('SUCCESS', `${backupFilename} | hash: ${hash.substring(0, 12)}... | size: ${(compressed.length / 1024).toFixed(1)}KB`);

    // Clean up old backups
    await cleanupOldBackups();

    console.log('SQLite backup completed successfully');
    return backupPath;
  } catch (error) {
    console.error('Error creating SQLite backup:', error);
    await logBackupOperation('ERROR', `SQLite backup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Log backup operations
 */
async function logBackupOperation(status, message) {
  try {
    // Sanitiza a mensagem: remove possíveis dados sensíveis (senhas, tokens, chaves)
    const sanitizedMessage = message
      .replace(/(password|senha|token|secret|key|chave)\s*[=:]\s*\S+/gi, '$1=***')
      .replace(/(DATABASE_URL|JWT_SECRET|ADMIN_PASSWORD|BACKUP_ENCRYPTION_KEY)\s*=\s*\S+/g, '$1=***');

    const logEntry = `[${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] [${status}] [SQLite] ${sanitizedMessage}\n`;

    // Append to log file
    fs.appendFileSync(LOG_FILE, logEntry);

    // Keep only last 100 lines
    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    const logLines = logContent.split('\n');
    if (logLines.length > 100) {
      const recentLogs = logLines.slice(-100).join('\n');
      fs.writeFileSync(LOG_FILE, recentLogs);
    }
  } catch (error) {
    console.error('Error logging backup operation:', error);
  }
}

/**
 * Clean up old SQLite backups
 */
async function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith(BACKUP_CONFIG.backupPrefix) && file.endsWith('.sql.gz'))
      .sort((a, b) => {
        // Sort by ISO 8601 timestamp (newest first)
        const timestampA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/)?.[0];
        const timestampB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/)?.[0];
        if (!timestampA && !timestampB) return 0;
        if (!timestampA) return 1;
        if (!timestampB) return -1;
        return timestampB.localeCompare(timestampA);
      });

    if (files.length > BACKUP_CONFIG.maxBackups) {
      const filesToRemove = files.slice(BACKUP_CONFIG.maxBackups);

      for (const file of filesToRemove) {
        const filePath = path.join(BACKUP_DIR, file);
        const hashPath = `${filePath}.sha256`;

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (fs.existsSync(hashPath)) fs.unlinkSync(hashPath);

        console.log(`Removed old SQLite backup: ${file}`);
        await logBackupOperation('INFO', `Removed old SQLite backup: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old SQLite backups:', error);
  }
}

/**
 * Restore SQLite database from backup
 */
export async function restoreSqliteBackup(backupFilename) {
  try {
    ensureBackupDirectory();
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupFilename}`);
    }

    // 1. Create safety backup of current SQLite
    console.log('🔄 Criando backup de segurança do SQLite atual...');
    const safetyBackup = path.join(BACKUP_DIR, `pre-restore-sqlite_${format(new Date(), "yyyy-MM-dd'T'HH-mm-ss'Z'")}.sql.gz`);
    if (fs.existsSync(SQLITE_DB)) {
      const dumpContent = execSync(`sqlite3 "${SQLITE_DB}" .dump`, { encoding: 'buffer' });
      const compressed = zlib.gzipSync(dumpContent);
      fs.writeFileSync(safetyBackup, compressed);
      console.log(`✅ Backup de segurança criado: ${path.basename(safetyBackup)}`);
    }

    // 2. Verify integrity
    const crypto = await import('crypto');
    const hashPath = `${backupPath}.sha256`;

    if (fs.existsSync(hashPath)) {
      console.log('🔍 Verificando integridade do backup...');
      const expectedHash = fs.readFileSync(hashPath, 'utf8').trim();
      const fileBuffer = fs.readFileSync(backupPath);
      const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      if (expectedHash !== actualHash) {
        throw new Error(`❌ BACKUP CORROMPIDO! Hash não confere.\nEsperado: ${expectedHash}\nRecebido: ${actualHash}`);
      }
      console.log('✅ Integridade verificada com sucesso.');
    }

    // 3. Restore
    console.log(`🔄 Restaurando SQLite de ${backupFilename}...`);
    const compressed = fs.readFileSync(backupPath);
    const dumpContent = zlib.gunzipSync(compressed).toString('utf8');

    execSync(`sqlite3 "${SQLITE_DB}"`, { input: dumpContent, stdio: ['pipe', 'pipe', 'pipe'] });

    console.log('✅ SQLite restaurado com sucesso.');
    await logBackupOperation('RESTORE_SUCCESS', `SQLite restaurado de ${backupFilename}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao restaurar SQLite:', error);
    await logBackupOperation('RESTORE_ERROR', error.message);
    throw error;
  }
}

/**
 * List available SQLite backups
 */
export async function getSqliteBackups() {
  try {
    ensureBackupDirectory();

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith(BACKUP_CONFIG.backupPrefix) && file.endsWith('.sql.gz'))
      .sort((a, b) => {
        const timestampA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/)?.[0];
        const timestampB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/)?.[0];
        if (!timestampA && !timestampB) return 0;
        if (!timestampA) return 1;
        if (!timestampB) return -1;
        return timestampB.localeCompare(timestampA);
      });

    return files.map(file => {
      const timestampMatch = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/);
      const timestamp = timestampMatch ? timestampMatch[0] : 'unknown';
      const formattedDate = timestamp.replace('T', ' ').replace(/-(\d{2})Z$/, '-$1');
      return {
        filename: file,
        timestamp: formattedDate,
        size: fs.statSync(path.join(BACKUP_DIR, file)).size,
        compressed: true
      };
    });
  } catch (error) {
    console.error('Error listing SQLite backups:', error);
    throw error;
  }
}

// Run directly if called from CLI
const isMainModule = process.argv[1] && 
  (process.argv[1].includes('backup-sqlite') || process.argv[1].endsWith('backup-sqlite.js'));

if (isMainModule) {
  createSqliteBackup().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}