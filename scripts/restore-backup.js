#!/usr/bin/env node
import { loadEnv } from './utils/load-env.js';
import { restoreBackup, getAvailableBackups } from './backup.js';

// Carrega variáveis de ambiente (módulo compartilhado)
loadEnv();

async function runRestore() {
  const file = process.argv[2];

  if (!file) {
    console.log('📋 Backups disponíveis na pasta data/backups:');
    try {
      const backups = await getAvailableBackups();
      if (backups.length === 0) console.log('   (Nenhum backup encontrado)');
      backups.forEach(b => console.log(`   - ${b.filename} (${b.timestamp})`));
    } catch {
      console.log('   (Erro ao listar backups)');
    }
    console.log('\n❌ Erro: Você precisa especificar o arquivo.');
    console.log('👉 Uso: node scripts/restore-backup.js <nome-do-arquivo.sql.gz>');
    console.log('   Ou:  npm run restore-backup <nome-do-arquivo.sql.gz>');
    return;
  }

  try {
    // Executa a restauração
    await restoreBackup(file);
    console.log('✅ Backup de segurança pré-restore criado com sucesso.');
  } catch (error) {
    console.error('❌ Falha ao restaurar backup:', error);
    process.exit(1);
  }
}

runRestore();
