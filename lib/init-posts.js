import 'dotenv/config';
import { query } from './db.js';

async function initPosts() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Erro: DATABASE_URL não definida. Verifique se o arquivo .env existe na raiz do projeto.');
    console.error('   Nota: Scripts Node.js com dotenv não carregam .env.local automaticamente. Use um arquivo .env.');
    process.exit(1);
  }

  if (process.env.DATABASE_URL.includes('sqlite') || process.env.DATABASE_URL.includes('.db')) {
    console.error('❌ Erro: A DATABASE_URL parece estar configurada para SQLite.');
    console.error('   O projeto foi migrado para PostgreSQL. Por favor, configure a conexão com o servidor PostgreSQL no arquivo .env.');
    process.exit(1);
  }

  const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':******@');
  console.log(`🔌 Tentando conectar com: ${maskedUrl}`);

  console.log('Criando tabelas do banco de dados...');
  
  // PostgreSQL syntax
  const createPostsTableQuery = `
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

  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createImagesTableQuery = `
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      type TEXT,
      size INTEGER,
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createSettingsTableQuery = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      type TEXT,
      description TEXT,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createVideosTableQuery = `
    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      url_youtube TEXT NOT NULL,
      descricao TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await query(createPostsTableQuery);
    console.log('✅ Tabela posts criada/verificada com sucesso!');
    await query(createUsersTableQuery);
    console.log('✅ Tabela users criada/verificada com sucesso!');
    await query(createImagesTableQuery);
    console.log('✅ Tabela images criada/verificada com sucesso!');
    await query(createSettingsTableQuery);
    console.log('✅ Tabela settings criada/verificada com sucesso!');
    await query(createVideosTableQuery);
    console.log('✅ Tabela videos criada/verificada com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao inicializar tabelas:', err.message);
    if (err.code === '28P01') {
      console.error('💡 Dica: Falha de autenticação. Verifique se o usuário e senha no DATABASE_URL (arquivo .env) estão corretos.');
    }
    process.exit(1);
  }
}

initPosts().catch((err) => {
  console.error('❌ Erro ao inicializar tabela de posts:', err);
  process.exit(1);
});