#!/usr/bin/env node

/**
 * Monitor de espaço em disco
 *
 * Verifica o uso de disco em um ou mais mount points e alerta
 * quando o uso ultrapassa o threshold configurado.
 *
 * Integração:
 *   - Pode ser executado manualmente: node scripts/monitor-disk-space.js
 *   - Integrado ao scheduler de backup (backup.js): verifica disco antes de cada backup
 *   - Pode ser agendado via cron do sistema:
 *     ┌─────────────────────────────────────────────────────
 *     │ # Executar a cada hora, das 6h às 22h
 *     │ 0 6-22 * * * /caminho/para/scripts/monitor-disk-space.js >> /var/log/disk-monitor.log 2>&1
 *     └─────────────────────────────────────────────────────
 *
 * Flags:
 *   --dry-run       Apenas simula a verificação, sem emitir exit code de erro
 *   --json          Saída em JSON para consumo por sistemas de monitoramento
 *   --help          Exibe mensagem de ajuda
 *
 * Uso:
 *   node scripts/monitor-disk-space.js                    # Verifica mount point padrão (/)
 *   node scripts/monitor-disk-space.js /dados /var        # Verifica múltiplos mount points
 *   node scripts/monitor-disk-space.js --json             # Saída em JSON
 *   node scripts/monitor-disk-space.js --dry-run          # Simulação sem exit code de erro
 *
 * Variáveis de ambiente:
 *   DISK_THRESHOLD   Percentual de uso que dispara alerta (default: 85)
 *   DISK_PATH        Caminho do mount point a verificar (default: /)
 */

import { spawn } from 'child_process';
import fs from 'fs';
import { DISK_THRESHOLD_PERCENT, DISK_PATH_DEFAULT } from './utils/constants.js';

// ─── Configurações ──────────────────────────────────────
const THRESHOLD = parseInt(process.env.DISK_THRESHOLD || String(DISK_THRESHOLD_PERCENT), 10);
const DEFAULT_MOUNT = process.env.DISK_PATH || DISK_PATH_DEFAULT;

// ─── Parse de argumentos ────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isJson = args.includes('--json');
const isHelp = args.includes('--help');

// Filtra flags para obter apenas os mount points
const mountPoints = args.filter(a => !a.startsWith('--'));

// Se nenhum mount point foi passado como argumento, usa o padrão
const targets = mountPoints.length > 0 ? mountPoints : [DEFAULT_MOUNT];

// ─── Help ────────────────────────────────────────────────
if (isHelp) {
  console.log(`
🔍 Monitor de Espaço em Disco

Uso:
  node scripts/monitor-disk-space.js [mount_points...] [flags]

Flags:
  --dry-run     Apenas simula a verificação, sem emitir exit code de erro
  --json        Saída em JSON para consumo por sistemas de monitoramento
  --help        Exibe esta mensagem de ajuda

Exemplos:
  node scripts/monitor-disk-space.js
  node scripts/monitor-disk-space.js /dados /var
  node scripts/monitor-disk-space.js --json
  node scripts/monitor-disk-space.js --dry-run

Variáveis de ambiente:
  DISK_THRESHOLD   Percentual de uso que dispara alerta (default: ${THRESHOLD})
  DISK_PATH        Caminho do mount point a verificar (default: ${DEFAULT_MOUNT})
  `);
  process.exit(0);
}

// ─── Funções Utilitárias ────────────────────────────────

/**
 * Verifica o uso de disco via comando df com spawn (seguro contra command injection)
 * @param {string} mountPoint - Caminho do mount point a verificar
 * @returns {Promise<{mount: string, usagePercent: number, size: string, used: string, available: string} | null>}
 */
function checkDiskViaDf(mountPoint) {
  return new Promise((resolve, reject) => {
    const child = spawn('df', ['-h', mountPoint], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('error', (error) => {
      // df não encontrado ou erro de execução
      resolve(null);
    });

    child.on('close', (code) => {
      if (code !== 0 || stderr.trim()) {
        resolve(null);
        return;
      }

      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/(\d+)%/);

      if (match && match[1]) {
        const usagePercent = parseInt(match[1], 10);

        // Extrai Size, Used, Available da saída do df
        const columns = lastLine.split(/\s+/);
        // Filesystem Size Used Avail Use% Mounted on
        const size = columns[1] || 'N/A';
        const used = columns[2] || 'N/A';
        const available = columns[3] || 'N/A';

        resolve({
          mount: mountPoint,
          usagePercent,
          size,
          used,
          available
        });
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Fallback: verifica uso de disco via fs.promises.statfs (nativo do Node.js)
 * Usado quando o comando df não está disponível (ex: container minimalista)
 * @param {string} mountPoint - Caminho do mount point a verificar
 * @returns {Promise<{mount: string, usagePercent: number, size: string, used: string, available: string} | null>}
 */
async function checkDiskViaStatfs(mountPoint) {
  try {
    const statfs = await fs.promises.statfs(mountPoint);

    const totalBlocks = statfs.blocks;
    const freeBlocks = statfs.bfree;
    const availableBlocks = statfs.bavail;
    const blockSize = statfs.bsize;

    const totalBytes = totalBlocks * blockSize;
    const freeBytes = freeBlocks * blockSize;
    const availableBytes = availableBlocks * blockSize;
    const usedBytes = totalBytes - freeBytes;

    const usagePercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

    // Formata bytes para legibilidade humana
    const formatBytes = (bytes) => {
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let value = bytes;
      let unitIndex = 0;
      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
      }
      return `${value.toFixed(1)}${units[unitIndex]}`;
    };

    return {
      mount: mountPoint,
      usagePercent,
      size: formatBytes(totalBytes),
      used: formatBytes(usedBytes),
      available: formatBytes(availableBytes)
    };
  } catch {
    return null;
  }
}

/**
 * Verifica o uso de disco para um mount point, tentando df primeiro e statfs como fallback
 */
async function checkMountPoint(mountPoint) {
  let result = await checkDiskViaDf(mountPoint);
  if (result === null) {
    result = await checkDiskViaStatfs(mountPoint);
  }
  return result;
}

// ─── Execução Principal ─────────────────────────────────

async function main() {
  const results = [];

  for (const mountPoint of targets) {
    const result = await checkMountPoint(mountPoint);
    if (result) {
      results.push(result);
    } else {
      results.push({
        mount: mountPoint,
        usagePercent: null,
        error: `Não foi possível verificar o mount point '${mountPoint}'`
      });
    }
  }

  // Determina se houve alerta
  const alerts = results.filter(r => r.usagePercent !== null && r.usagePercent >= THRESHOLD);
  const hasAlert = alerts.length > 0;

  // ─── Saída JSON ───────────────────────────────────────
  if (isJson) {
    const jsonOutput = {
      timestamp: new Date().toISOString(),
      threshold: THRESHOLD,
      healthy: !hasAlert,
      checks: results.map(r => ({
        mount_point: r.mount,
        usage_percent: r.usagePercent,
        size: r.size || null,
        used: r.used || null,
        available: r.available || null,
        healthy: r.usagePercent !== null ? r.usagePercent < THRESHOLD : false,
        error: r.error || null
      }))
    };

    console.log(JSON.stringify(jsonOutput, null, 2));

    if (hasAlert && !isDryRun) {
      process.exit(1);
    }
    return;
  }

  // ─── Saída Texto ──────────────────────────────────────
  console.log(`🔍 Verificando espaço em disco...`);
  console.log(`📊 Threshold de alerta: ${THRESHOLD}%`);
  console.log('');

  let allHealthy = true;

  for (const result of results) {
    if (result.error) {
      console.error(`❌ ${result.mount}: ${result.error}`);
      allHealthy = false;
      continue;
    }

    const status = result.usagePercent >= THRESHOLD ? '⚠️  ALERTA' : '✅ OK';
    console.log(`${status}  ${result.mount}`);
    console.log(`   Tamanho: ${result.size}  Usado: ${result.used}  Disponível: ${result.available}`);
    console.log(`   Uso: ${result.usagePercent}%`);

    if (result.usagePercent >= THRESHOLD) {
      allHealthy = false;
      console.error(`\n⚠️  O disco '${result.mount}' está ficando cheio! (${result.usagePercent}% utilizado)`);
      console.error(`   Recomendação: Execute 'npm run find-unused' ou limpe backups antigos em 'data/backups'.\n`);
    }
  }

  if (allHealthy) {
    console.log('✅ Espaço em disco saudável.');
  }

  // Só emite exit code de erro se não for dry-run e houver alerta
  if (!allHealthy && !isDryRun) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Erro inesperado:', error.message);
  process.exit(1);
});