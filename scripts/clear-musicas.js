import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function clearMusicas() {
  // Importação dinâmica para garantir carregamento das env vars
  const { query, closeDatabase } = await import('../lib/db.js');

  try {
    console.log('🗑️  Limpando todas as músicas do banco de dados...');
    await query('DELETE FROM musicas');
    console.log('✅ Tabela de músicas limpa com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao limpar músicas:', error);
  } finally {
    await closeDatabase();
  }
}

clearMusicas();