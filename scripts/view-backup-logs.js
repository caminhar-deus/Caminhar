#!/usr/bin/env node
import { loadEnv } from './utils/load-env.js';
import { getBackupLogs } from './backup.js';

// Carrega variáveis de ambiente (módulo compartilhado)
loadEnv();

/**
 * Exibe os logs do sistema de backup.
 * Uso: node scripts/view-backup-logs.js
 */
async function main() {
  try {
    const logs = await getBackupLogs();

    if (logs.length === 0) {
      console.log('📋 Nenhum registro de log de backup encontrado.');
      return;
    }

    console.log(`📋 Últimos ${logs.length} registros de backup:\n`);
    logs.forEach(entry => {
      console.log(`  [${entry.timestamp}] [${entry.status}] ${entry.message}`);
    });
  } catch (error) {
    console.error('❌ Erro ao exibir logs de backup:', error);
    process.exit(1);
  }
}

main();