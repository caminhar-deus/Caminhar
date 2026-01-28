import { query } from './db.js';

async function initPosts() {
  console.log('Criando tabela de posts...');
  
  // PostgreSQL syntax
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT,
      content TEXT,
      image_url TEXT,
      published BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await query(createTableQuery);
    console.log('✅ Tabela posts criada/verificada com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao inicializar tabela de posts:', err);
    process.exit(1);
  }
}

initPosts().catch((err) => {
  console.error('❌ Erro ao inicializar tabela de posts:', err);
  process.exit(1);
});