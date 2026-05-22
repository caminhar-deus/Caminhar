#!/usr/bin/env node
import { initializeBackupSystem } from './backup.js';

/**
 * Inicializa o sistema de backup (cria backup inicial)
 * O agendamento automático deve ser configurado via cron do sistema operacional:
 *
 *   ┌─────────────────────────────────────────────────────
 *   │ # Backup diário às 2 AM
 *   │ 0 2 * * * cd /caminho/do/projeto && node scripts/create-backup.js >> data/backups/backup.log 2>&1
 *   └─────────────────────────────────────────────────────
 */
async function main() {
  try {
    console.log('Iniciando sistema de backup...');

    // Inicializa o sistema de backup (cria o primeiro backup)
    await initializeBackupSystem();

    console.log('Sistema de backup inicializado.');
    console.log('Para backups automáticos, configure o cron do sistema:');
    console.log('  0 2 * * * cd /caminho/do/projeto && node scripts/create-backup.js >> data/backups/backup.log 2>&1');
    console.log('');
    console.log('Para backups manuais: node scripts/create-backup.js');
  } catch (error) {
    console.error('Falha ao iniciar sistema de backup:', error);
    process.exit(1);
  }
}

// Executa a inicialização
main().catch(error => {
  console.error('Erro não tratado na inicialização do backup:', error);
  process.exit(1);
});
