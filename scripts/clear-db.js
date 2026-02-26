import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function clearDatabase() {
  const { query, closeDatabase } = await import('../lib/db.js');

  try {
    console.log('🗑️  Esvaziando todas as tabelas do banco de dados...');
    
    // TRUNCATE limpa os dados mais rápido que DELETE
    // RESTART IDENTITY reseta os IDs para 1
    // CASCADE limpa tabelas dependentes (ex: images que dependem de users)
    await query(`
      TRUNCATE TABLE 
        posts, videos, musicas, images, settings, users 
      RESTART IDENTITY CASCADE;
    `);
    
    console.log('✅ Banco de dados limpo com sucesso! (Estrutura mantida, dados removidos)');
  } catch (error) {
    console.error('❌ Erro ao limpar o banco de dados:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

clearDatabase();