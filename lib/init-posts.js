import 'dotenv/config';
import { query, closeDatabase } from './db.js';

async function initPosts() {
  try {
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