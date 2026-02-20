import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente (para ter acesso à senha do banco)
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function runRestore() {
  // Importação dinâmica para garantir que o env já foi carregado
  const { restoreBackup, getAvailableBackups } = await import('./backup.js');
  
  const file = process.argv[2];

  if (!file) {
    console.log('📋 Backups disponíveis na pasta data/backups:');
    try {
      const backups = await getAvailableBackups();
      if (backups.length === 0) console.log('   (Nenhum backup encontrado)');
      backups.forEach(b => console.log(`   - ${b.filename} (${b.timestamp})`));
    } catch (e) {
      console.log('   (Erro ao listar backups)');
    }
    console.log('\n❌ Erro: Você precisa especificar o arquivo.');
    console.log('👉 Uso: npm run restore-backup <nome-do-arquivo.sql.gz>');
    return;
  }

  // Executa a restauração
  await restoreBackup(file);
}

runRestore();