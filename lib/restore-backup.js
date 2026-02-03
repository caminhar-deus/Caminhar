import { restoreBackup } from './backup.js';

const filename = process.argv[2];

if (!filename) {
  console.error('❌ Erro: Nome do arquivo de backup não fornecido.');
  console.error('Uso: npm run restore-backup <nome-do-arquivo.db.gz>');
  console.error('Exemplo: npm run restore-backup caminhar-db-backup_2026-02-03.db.gz');
  process.exit(1);
}

console.log(`🔄 Iniciando restauração do backup: ${filename}...`);

restoreBackup(filename)
  .then(() => console.log('✅ Restauração concluída com sucesso!'))
  .catch((error) => {
    console.error('❌ Falha na restauração:', error);
    process.exit(1);
  });