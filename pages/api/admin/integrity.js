import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { query } from '../../../lib/db.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Endpoint de verificação de integridade do sistema.
 *
 * GET /api/admin/integrity — Retorna diagnóstico completo do sistema
 */

const REDIS_AVAILABLE = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

async function handleGet(req, res) {
  const checks = {
    database: { status: 'unknown', label: 'Banco de Dados', details: {} },
    cache: { status: 'unknown', label: 'Cache/Redis', details: {} },
    storage: { status: 'unknown', label: 'Armazenamento', details: {} },
    backup: { status: 'unknown', label: 'Backup', details: {} },
    system: { status: 'ok', label: 'Sistema', details: {} },
  };

  // ── 1. Verificação do Banco de Dados ──────────────────────────
  try {
    const start = Date.now();
    await query('SELECT 1');
    const latency = Date.now() - start;

    // Verifica tamanho do banco e conexões ativas
    const dbInfo = await query(`
      SELECT
        pg_database_size(current_database()) as db_size,
        numbackends as connections
      FROM pg_stat_database
      WHERE datname = current_database()
    `);

    checks.database.status = 'ok';
    checks.database.details = {
      connected: true,
      latency: `${latency}ms`,
      size: dbInfo.rows[0]?.db_size
        ? formatBytes(parseInt(dbInfo.rows[0].db_size))
        : 'Desconhecido',
      connections: dbInfo.rows[0]?.connections || 0,
    };
  } catch (error) {
    checks.database.status = 'error';
    checks.database.details = {
      connected: false,
      error: error.message,
    };
  }

  // ── 2. Verificação do Redis/Cache ─────────────────────────────
  if (REDIS_AVAILABLE) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const pingResult = await redis.ping();
      checks.cache.status = pingResult === 'PONG' ? 'ok' : 'degraded';
      checks.cache.details = {
        connected: pingResult === 'PONG',
        type: 'Upstash Redis',
      };
    } catch (error) {
      checks.cache.status = 'degraded';
      checks.cache.details = {
        connected: false,
        error: error.message,
      };
    }
  } else {
    checks.cache.status = 'warning';
    checks.cache.details = {
      connected: false,
      message: 'Redis não configurado. Cache em memória sendo utilizado.',
    };
  }

  // ── 3. Verificação de Armazenamento ──────────────────────────
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const stats = fs.statfsSync(uploadsDir);

      // Calcula tamanho total dos uploads
      let totalSize = 0;
      const calculateSize = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isFile()) {
            totalSize += fs.statSync(fullPath).size;
          } else if (entry.isDirectory()) {
            calculateSize(fullPath);
          }
        }
      };
      calculateSize(uploadsDir);

      checks.storage.status = 'ok';
      checks.storage.details = {
        uploadsPath: '/public/uploads',
        totalFiles: files.length,
        totalSize: formatBytes(totalSize),
        diskFree: formatBytes(stats.bsize * stats.bavail),
        diskTotal: formatBytes(stats.bsize * stats.blocks),
      };
    } else {
      checks.storage.status = 'warning';
      checks.storage.details = {
        message: 'Diretório de uploads não encontrado',
        path: '/public/uploads',
      };
    }
  } catch (error) {
    checks.storage.status = 'warning';
    checks.storage.details = { error: error.message };
  }

  // ── 4. Verificação de Backup ─────────────────────────────────
  try {
    const backupsDir = path.join(process.cwd(), 'data', 'backups');

    if (fs.existsSync(backupsDir)) {
      const backupFiles = fs.readdirSync(backupsDir)
        .filter(f => f.endsWith('.sql') || f.endsWith('.dump') || f.endsWith('.gz') || f.endsWith('.enc'))
        .map(f => ({
          name: f,
          size: formatBytes(fs.statSync(path.join(backupsDir, f)).size),
          date: fs.statSync(path.join(backupsDir, f)).mtime.toISOString(),
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      const lastBackup = backupFiles.length > 0 ? backupFiles[0] : null;

      checks.backup.status = lastBackup ? 'ok' : 'warning';
      checks.backup.details = {
        totalBackups: backupFiles.length,
        lastBackup: lastBackup ? {
          name: lastBackup.name,
          size: lastBackup.size,
          date: lastBackup.date,
          age: formatTimeAgo(new Date(lastBackup.date)),
        } : null,
        directory: '/data/backups',
      };
    } else {
      checks.backup.status = 'warning';
      checks.backup.details = {
        message: 'Diretório de backups não encontrado',
        path: '/data/backups',
      };
    }
  } catch (error) {
    checks.backup.status = 'warning';
    checks.backup.details = { error: error.message };
  }

  // ── 5. Informações do Sistema ────────────────────────────────
  checks.system.details = {
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    uptime: formatUptime(process.uptime()),
    memoryUsage: formatBytes(process.memoryUsage().rss),
    cpuCores: os.cpus().length,
    env: process.env.NODE_ENV || 'development',
  };

  // Calcula status geral
  const statuses = Object.values(checks).map(c => c.status);
  const overallStatus = statuses.every(s => s === 'ok')
    ? 'healthy'
    : statuses.some(s => s === 'error')
      ? 'degraded'
      : 'warning';

  return res.status(200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  });
}

// ── Utilitários ─────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '<1m';
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Menos de 1 hora atrás';
  if (diffHours < 24) return `${diffHours} hora(s) atrás`;
  return `${diffDays} dia(s) atrás`;
}

export default createAdminHandler({
  name: 'Integrity',
  permission: 'Segurança',
  handlers: { GET: handleGet },
  allowedMethods: ['GET'],
});