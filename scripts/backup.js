#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import zlib from 'zlib';
import { spawn } from 'child_process';
import crypto from 'crypto';
import {
  MAX_BACKUPS,
  DEFAULT_LIST_LIMIT,
  BACKUP_INTERVAL_MS,
  ENCRYPTION_KEY_LENGTH,
  MAX_LOG_LINES,
  DISK_THRESHOLD_PERCENT,
  DISK_PATH_DEFAULT
} from './utils/constants.js';

// Caminhos do banco de dados e backups
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');
const LOG_FILE = path.join(process.cwd(), 'data', 'backups', 'backup.log');

// Configuração do sistema de backup
const BACKUP_CONFIG = {
  maxBackups: MAX_BACKUPS, // Número máximo de backups a manter
  backupInterval: '0 2 * * *', // Diário às 2 AM (formato cron)
  backupPrefix: 'caminhar-pg-backup'
};

// Buffer de log em memória: evita leitura+reescrita do arquivo a cada operação
const logBuffer = [];

// ──────────────────────────────────────────────
//  Funções utilitárias compartilhadas
// ──────────────────────────────────────────────

/**
 * Calcula hash SHA-256 usando stream (sem carregar arquivo inteiro na RAM)
 */
function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Retorna lista ordenada de arquivos de backup (lógica centralizada — item 2.7, item 3.4)
 * Usa fs.promises.opendir() para leitura incremental, interrompendo ao atingir o limite.
 * @param {number} [maxFiles=Infinity] - Número máximo de arquivos a retornar.
 */
async function getBackupFiles(maxFiles = Infinity) {
  const backupFiles = [];

  const dir = await fs.promises.opendir(BACKUP_DIR);
  for await (const dirent of dir) {
    if (dirent.isFile() && dirent.name.startsWith(BACKUP_CONFIG.backupPrefix) &&
        (dirent.name.endsWith('.sql.gz') || dirent.name.endsWith('.enc'))) {
      backupFiles.push(dirent.name);
    }
  }

  // Remove duplicatas (.enc -> nome base)
  const seen = new Set();
  const uniqueFiles = [];
  for (const file of backupFiles) {
    const baseName = file.endsWith('.enc') ? file.slice(0, -4) : file;
    if (!seen.has(baseName)) {
      seen.add(baseName);
      uniqueFiles.push(baseName);
    }
  }

  // Ordena por timestamp ISO 8601 (mais recente primeiro)
  uniqueFiles.sort((a, b) => {
    const timestampA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/)?.[0];
    const timestampB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/)?.[0];
    if (!timestampA && !timestampB) return 0;
    if (!timestampA) return 1;
    if (!timestampB) return -1;
    return timestampB.localeCompare(timestampA);
  });

  // Aplica limite: retorna apenas os primeiros maxFiles
  return maxFiles === Infinity ? uniqueFiles : uniqueFiles.slice(0, maxFiles);
}

/**
 * Executa pg_dump via spawn (sem shell) com pipe para gzip stream
 * Seguro contra command injection (item 1.2)
 */
function runPgDumpToFile(dbUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const pgDump = spawn('pg_dump', ['-d', dbUrl], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const gzip = zlib.createGzip();
    const writeStream = fs.createWriteStream(outputPath);

    pgDump.stdout.pipe(gzip).pipe(writeStream);

    let stderr = '';
    pgDump.stderr.on('data', (data) => { stderr += data.toString(); });

    writeStream.on('error', reject);
    gzip.on('error', reject);
    pgDump.on('error', reject);

    writeStream.on('finish', () => {
      if (pgDump.exitCode !== 0 && pgDump.exitCode !== null) {
        return reject(new Error(`pg_dump falhou (exit ${pgDump.exitCode}): ${stderr}`));
      }
      resolve();
    });
  });
}

/**
 * Executa psql via spawn (sem shell) com gunzip stream
 * Seguro contra command injection (item 1.2)
 */
function runPsqlFromFile(dbUrl, inputPath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(inputPath);
    const gunzip = zlib.createGunzip();
    const psql = spawn('psql', ['-d', dbUrl], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    readStream.pipe(gunzip).pipe(psql.stdin);

    let stderr = '';
    psql.stderr.on('data', (data) => { stderr += data.toString(); });

    let stdout = '';
    psql.stdout.on('data', (data) => { stdout += data.toString(); });

    psql.on('error', reject);
    readStream.on('error', reject);
    gunzip.on('error', reject);
    psql.stdin.on('error', reject);

    psql.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`psql falhou (exit ${code}): ${stderr}`));
      }
      resolve(stdout);
    });
  });
}

/**
 * Garante que o diretório de backups existe (usando fs.promises assíncrono)
 */
async function ensureBackupDirectory() {
  try {
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Erro ao criar diretório de backup:', error);
      throw error;
    }
  }
}

/**
 * Gera nome de arquivo de backup com timestamp ISO 8601 (padronizado)
 */
function generateBackupFilename() {
  const timestamp = format(new Date(), "yyyy-MM-dd'T'HH-mm-ss'Z'");
  return `${BACKUP_CONFIG.backupPrefix}_${timestamp}.sql.gz`;
}

/**
 * Verifica espaço em disco antes de criar o backup
 * Usa spawn para segurança (command injection) e fs.promises.statfs como fallback
 * Integração com monitor-disk-space.js (item 6.2)
 */
async function checkDiskBeforeBackup() {
  const mountPoint = process.env.DISK_PATH || DISK_PATH_DEFAULT;
  const threshold = parseInt(process.env.DISK_THRESHOLD || String(DISK_THRESHOLD_PERCENT), 10);

  // Tenta via df com spawn (sem shell)
  try {
    const diskInfo = await new Promise((resolve) => {
      const child = spawn('df', ['-h', mountPoint], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      child.stdout.on('data', (data) => { stdout += data.toString(); });

      child.on('error', () => resolve(null));
      child.on('close', (code) => {
        if (code !== 0) { resolve(null); return; }
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const match = lastLine.match(/(\d+)%/);
        if (match) resolve(parseInt(match[1], 10));
        else resolve(null);
      });
    });

    if (diskInfo !== null) {
      if (diskInfo >= threshold) {
        console.warn(`⚠️  Disco em '${mountPoint}' com ${diskInfo}% de uso (threshold: ${threshold}%)`);
        console.warn('   Continuando backup, mas recomenda-se liberar espaço em disco.');
        await logBackupOperation('WARNING', `Disco em ${mountPoint} com ${diskInfo}% de uso`);
      }
      return;
    }
  } catch { /* fallback abaixo */ }

  // Fallback: fs.promises.statfs (nativo, sem dependência externa)
  try {
    const statfs = await fs.promises.statfs(mountPoint);
    const totalBytes = statfs.blocks * statfs.bsize;
    const freeBytes = statfs.bfree * statfs.bsize;
    const usedBytes = totalBytes - freeBytes;
    const usagePercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

    if (usagePercent >= threshold) {
      console.warn(`⚠️  Disco em '${mountPoint}' com ${usagePercent}% de uso (threshold: ${threshold}%)`);
      await logBackupOperation('WARNING', `Disco em ${mountPoint} com ${usagePercent}% de uso`);
    }
  } catch {
    // Se ambos os métodos falharem, apenas loga warning e continua
    console.warn(`⚠️  Não foi possível verificar espaço em disco em '${mountPoint}'. Continuando backup.`);
  }
}

/**
 * Cria um backup do banco de dados PostgreSQL
 */
async function createBackup() {
  try {
    console.log('Iniciando backup do banco de dados...');

    // Verifica espaço em disco antes de prosseguir (item 6.2)
    await checkDiskBeforeBackup();

    // Garante que o diretório de backups existe
    await ensureBackupDirectory();

    // ===== Backup PostgreSQL =====
    console.log('--- Iniciando backup PostgreSQL ---');
    const backupFilename = generateBackupFilename();
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // Usa spawn sem shell para evitar command injection (item 1.2)
    await runPgDumpToFile(process.env.DATABASE_URL, backupPath);

    console.log(`Backup PostgreSQL criado: ${backupPath}`);

    // Calcula hash SHA-256 usando stream (item 3.3)
    const hash = await calculateFileHash(backupPath);
    await fs.promises.writeFile(`${backupPath}.sha256`, hash);

    // ✅ Criptografia em repouso AES-256-GCM
    if (process.env.BACKUP_ENCRYPTION_KEY) {
      try {
        const keyHex = process.env.BACKUP_ENCRYPTION_KEY;
        const keyBuffer = Buffer.from(keyHex, 'hex');

        // AES-256-GCM requer chave de exatamente 32 bytes (64 caracteres hex)
        if (keyBuffer.length !== ENCRYPTION_KEY_LENGTH) {
          console.warn(`⚠️ BACKUP_ENCRYPTION_KEY com comprimento inválido (${keyHex.length} chars hex, esperado 64). Backup NÃO criptografado.`);
        } else {
          const iv = crypto.randomBytes(12);
          const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

          // Lê o arquivo para criptografar (necessário ler os dados)
          const fileBuffer = await fs.promises.readFile(backupPath);
          const encrypted = Buffer.concat([
            iv,
            cipher.update(fileBuffer),
            cipher.final(),
            cipher.getAuthTag()
          ]);

          await fs.promises.writeFile(`${backupPath}.enc`, encrypted);
          await fs.promises.unlink(backupPath);

          console.log(`✅ Backup criptografado com sucesso: ${backupPath}.enc`);
        }
      } catch (cryptoError) {
        console.error('⚠️ Erro ao criptografar backup, mantendo arquivo original:', cryptoError.message);
      }
    }

    // Registra a operação no log
    await logBackupOperation('SUCCESS', `[PostgreSQL] ${backupFilename} | hash: ${hash.substring(0, 12)}...`);

    // Limpa backups antigos
    await cleanupOldBackups();

    console.log('Backup do banco de dados concluído com sucesso');
    return backupPath;
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    await logBackupOperation('ERROR', error.message);
    throw error;
  }
}

/**
 * Registra operações de backup no log (com sanitização — item 3.1)
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

    // Append ao arquivo de log (apenas append, sem re-escrita)
    await fs.promises.appendFile(LOG_FILE, logEntry);

    // Mantém buffer em memória para consultas rápidas
    logBuffer.push(logEntry);
    if (logBuffer.length > MAX_LOG_LINES) {
      logBuffer.shift();
    }
  } catch (error) {
    console.error('Erro ao registrar operação de backup:', error);
  }
}

/**
 * Limpa backups antigos (item 2.7, item 4.3)
 */
async function cleanupOldBackups() {
  try {
    const files = await getBackupFiles(BACKUP_CONFIG.maxBackups + 1);

    // Remove backups que excedem o limite máximo configurado
    if (files.length > BACKUP_CONFIG.maxBackups) {
      const filesToRemove = files.slice(BACKUP_CONFIG.maxBackups);

      for (const file of filesToRemove) {
        const filePath = path.join(BACKUP_DIR, file);
        const encPath = `${filePath}.enc`;
        const hashPath = `${filePath}.sha256`;

        // Usa fs.promises para operações assíncronas (item 3.2)
        try {
          await fs.promises.access(filePath);
          await fs.promises.unlink(filePath);
        } catch { /* arquivo não existe */ }

        try {
          await fs.promises.access(encPath);
          await fs.promises.unlink(encPath);
        } catch { /* arquivo não existe */ }

        try {
          await fs.promises.access(hashPath);
          await fs.promises.unlink(hashPath);
        } catch { /* arquivo não existe */ }

        console.log(`Backup antigo removido: ${file}`);
        await logBackupOperation('INFO', `Removed old backup: ${file}`);
      }
    }
  } catch (error) {
    console.error('Erro ao limpar backups antigos:', error);
    await logBackupOperation('ERROR', `Cleanup failed: ${error.message}`);
  }
}

/**
 * Restaura o banco de dados a partir de um arquivo de backup
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

    // Verifica existência do arquivo (usando fs.promises — item 3.2)
    try {
      await fs.promises.access(backupPath);
    } catch {
      try {
        await fs.promises.access(`${backupPath}.enc`);
      } catch {
        throw new Error(`Arquivo de backup não encontrado: ${backupFilename}`);
      }
    }

    // 1. Cria um backup de segurança antes de sobrescrever
    console.log('🔄 Criando um backup de segurança do banco de dados atual...');
    const safetyBackupFilename = `pre-restore-backup_${format(new Date(), "yyyy-MM-dd'T'HH-mm-ss'Z'")}.sql.gz`;
    const safetyBackupPath = path.join(BACKUP_DIR, safetyBackupFilename);

    // Usa spawn sem shell para segurança (item 1.2)
    try {
      await runPgDumpToFile(process.env.DATABASE_URL, safetyBackupPath);
      console.log(`✅ Backup de segurança criado: ${safetyBackupFilename}`);
    } catch (err) {
      console.error(`❌ Erro ao criar backup de segurança: ${err.message}`);
      throw new Error('Falha ao criar o backup de segurança. Restauração abortada.');
    }

    // ✅ Verificar integridade do backup antes de restaurar
    const hashPath = `${backupPath}.sha256`;

    // ✅ Descriptografar backup se estiver criptografado
    if (process.env.BACKUP_ENCRYPTION_KEY) {
      try {
        await fs.promises.access(`${backupPath}.enc`);
        // Backup está criptografado e precisa ser descriptografado
        console.log('🔓 Descriptografando backup...');

        const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
        const encrypted = await fs.promises.readFile(`${backupPath}.enc`);

        const iv = encrypted.subarray(0, 12);
        const authTag = encrypted.subarray(encrypted.length - 16);
        const ciphertext = encrypted.subarray(12, encrypted.length - 16);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        await fs.promises.writeFile(backupPath, decrypted);

        console.log('✅ Backup descriptografado com sucesso.');
      } catch {
        try {
          await fs.promises.access(backupPath);
          // Arquivo já está descriptografado, continuar
        } catch {
          throw new Error(`❌ Falha ao descriptografar backup: backup não encontrado`);
        }
      }
    }

    if (await fs.promises.access(hashPath).then(() => true).catch(() => false)) {
      console.log('🔍 Verificando integridade do backup...');

      const expectedHash = (await fs.promises.readFile(hashPath, 'utf8')).trim();
      const actualHash = await calculateFileHash(backupPath);

      if (expectedHash !== actualHash) {
        throw new Error(`❌ BACKUP CORROMPIDO! Hash não confere.\nEsperado: ${expectedHash}\nRecebido: ${actualHash}`);
      }

      console.log('✅ Integridade do backup verificada com sucesso.');
    } else {
      console.warn('⚠️ Arquivo de hash não encontrado. Continuando sem verificação de integridade.');
    }

    // 2. Prossegue com a restauração
    console.log(`🔄 Restaurando banco de dados a partir de ${backupFilename}...`);
    console.warn('⚠️ ATENÇÃO: Esta operação irá sobrescrever o banco de dados atual.');

    // Usa spawn sem shell para segurança (item 1.2)
    await runPsqlFromFile(process.env.DATABASE_URL, backupPath);

    console.log(`✅ Banco de dados PostgreSQL restaurado de: ${backupPath}`);

    await logBackupOperation('RESTORE_SUCCESS', `[PostgreSQL] Banco de dados restaurado de ${backupFilename}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao restaurar o backup:', error);
    await logBackupOperation('RESTORE_ERROR', error.message);
    throw error;
  }
}

/**
 * Retorna lista de backups disponíveis (item 2.7, item 3.4)
 */
async function getAvailableBackups(maxFiles = DEFAULT_LIST_LIMIT) {
  try {
    await ensureBackupDirectory();

    const files = await getBackupFiles(maxFiles);

    // Mapeia para objetos com metadados (assíncrono com fs.promises — item 3.2)
    const backupList = [];
    for (const file of files) {
      const timestampMatch = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)/);
      const timestamp = timestampMatch ? timestampMatch[0] : 'unknown';
      const formattedDate = timestamp.replace('T', ' ');

      let size = 0;
      try {
        const stat = await fs.promises.stat(path.join(BACKUP_DIR, file));
        size = stat.size;
      } catch { /* arquivo pode não existir mais */ }

      backupList.push({
        filename: file,
        timestamp: formattedDate.replace(/-(\d{2})Z$/, '-$1'),
        size,
        compressed: true
      });
    }

    return backupList;
  } catch (error) {
    console.error('Erro ao obter lista de backups disponíveis:', error);
    throw error;
  }
}

/**
 * Retorna logs de backup (lê do buffer em memória + arquivo)
 */
async function getBackupLogs() {
  try {
    // Tenta ler o arquivo de log para completar o buffer
    try {
      await fs.promises.access(LOG_FILE);
      const logContent = await fs.promises.readFile(LOG_FILE, 'utf8');
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
    } catch {
      return [];
    }
  } catch (error) {
    console.error('Erro ao ler logs de backup:', error);
    throw error;
  }
}

/**
 * Inicializa o sistema de backup
 */
async function initializeBackupSystem() {
  try {
    console.log('Inicializando sistema de backup...');

    // Garante que o diretório de backups existe
    await ensureBackupDirectory();

    // Cria backup inicial
    await createBackup();

    console.log('Sistema de backup inicializado');
  } catch (error) {
    console.error('Erro ao inicializar sistema de backup:', error);
    throw error;
  }
}

/**
 * Inicia o agendador automático de backups
 */
function startBackupScheduler() {
  try {
    console.log(`Iniciando agendador de backup com padrão cron: ${BACKUP_CONFIG.backupInterval}`);

    // Interpreta o padrão cron e configura o intervalo
    const cronParts = BACKUP_CONFIG.backupInterval.split(' ');
    if (cronParts.length === 5) {
      // Backup diário simples no horário especificado
      const [minute, hour] = cronParts.slice(0, 2).map(Number);

      // Calcula milissegundos até o próximo backup agendado
      const now = new Date();
      const nextBackup = new Date(now);

      // Define para a próxima ocorrência do horário agendado
      nextBackup.setHours(hour, minute, 0, 0);

      if (nextBackup <= now) {
        nextBackup.setDate(nextBackup.getDate() + 1); // Amanhã
      }

      const initialDelay = nextBackup - now;

      // Configura o agendador
      setTimeout(() => {
        createBackup().then(() => {
          // Configura intervalo diário (24 horas)
          setInterval(() => {
            createBackup().catch(console.error);
          }, BACKUP_INTERVAL_MS);
        }).catch(console.error);
      }, initialDelay);

      console.log(`Próximo backup agendado para: ${nextBackup}`);
      console.log(`Agendador de backup iniciado com sucesso`);
    }
  } catch (error) {
    console.error('Erro ao iniciar agendador de backup:', error);
    throw error;
  }
}

// Exporta funções para uso em outros módulos
export {
  createBackup,
  restoreBackup,
  cleanupOldBackups,
  getAvailableBackups,
  getBackupLogs,
  initializeBackupSystem,
  startBackupScheduler,
  checkDiskBeforeBackup
};