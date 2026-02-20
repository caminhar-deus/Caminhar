import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function initMusicas() {
  const { query, closeDatabase } = await import('../lib/db.js');

  try {
    console.log('⚠️  Garantindo um schema limpo. Removendo tabela de músicas se existir...');
    await query(`DROP TABLE IF EXISTS musicas CASCADE;`);

    console.log('🚀 Criando tabela de músicas...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS musicas (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        artista VARCHAR(255),
        url_spotify VARCHAR(255) NOT NULL,
        descricao TEXT,
        publicado BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tabela de músicas criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela de músicas:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

initMusicas();