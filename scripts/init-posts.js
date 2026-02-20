import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local (comum em Next.js)
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function initPosts() {
  const { query, closeDatabase } = await import('../lib/db.js');
  try {
    // Verifica se a string de conexão existe
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não definida. Verifique se o arquivo .env ou .env.local existe e contém a variável.');
    }

    console.log('⚠️  Garantindo um schema limpo. Removendo tabela de posts se existir...');
    await query(`DROP TABLE IF EXISTS posts CASCADE;`);

    console.log('🚀 Criando tabela de posts...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        excerpt TEXT,
        content TEXT,
        image_url VARCHAR(255),
        published BOOLEAN DEFAULT false,
        views INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tabela de posts criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela de posts:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

initPosts();