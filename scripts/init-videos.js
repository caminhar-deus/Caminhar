import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function initVideos() {
  const { query, closeDatabase } = await import('../lib/db.js');

  try {
    console.log('⚠️  Garantindo um schema limpo. Removendo tabela de vídeos se existir...');
    await query(`DROP TABLE IF EXISTS videos CASCADE;`);

    console.log('🚀 Criando tabela de vídeos...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        url_youtube VARCHAR(255) NOT NULL,
        descricao TEXT,
        publicado BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tabela de vídeos criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela de vídeos:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

initVideos();