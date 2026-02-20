import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function runMigration() {
  console.log('🚀 Executando migração: 001-add-views-to-posts');
  
  const { query, closeDatabase } = await import('../../lib/db.js');

  try {
    console.log('   - Adicionando coluna "views" à tabela "posts"...');
    
    // O comando ALTER TABLE modifica a tabela sem apagar os dados.
    // ADD COLUMN adiciona a nova coluna.
    // DEFAULT 0 define um valor padrão para todas as linhas existentes.
    // NOT NULL garante que a coluna sempre terá um valor.
    await query(`
      ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0 NOT NULL;
    `);
    
    console.log('✅ Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar a migração:', error);
    process.exit(1); // Encerra o processo com erro
  } finally {
    await closeDatabase();
  }
}

runMigration();