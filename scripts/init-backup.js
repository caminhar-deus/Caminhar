#!/usr/bin/env node
import { initializeBackupSystem, startBackupScheduler } from './backup.js';

/**
 * Inicializa e inicia o sistema de backup automático
 */
async function main() {
  try {
    console.log('Iniciando sistema de backup do banco de dados...');

    // Inicializa o sistema de backup (cria o primeiro backup)
    await initializeBackupSystem();

    // Inicia o agendador automático de backups
    startBackupScheduler();

    console.log('Sistema de backup em execução com agendamento automático.');
    console.log('É possível criar backups manuais via: node scripts/create-backup.js');
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
