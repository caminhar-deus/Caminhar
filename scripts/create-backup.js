import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function runBackup() {
  try {
    // Importação dinâmica para garantir que o env já foi carregado
    const { createBackup } = await import('./backup.js');
    await createBackup();
  } catch (error) {
    console.error('❌ Falha ao criar backup:', error);
    process.exit(1);
  }
}

runBackup();