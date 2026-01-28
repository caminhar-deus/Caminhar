import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import pg from 'pg';
import path from 'path';

async function migrate() {
  console.log('🚀 Iniciando migração de SQLite para PostgreSQL...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Erro: DATABASE_URL não definida no arquivo .env');
    process.exit(1);
  }

  // 1. Conectar ao SQLite
  const dbPath = path.join(process.cwd(), 'data', 'caminhar.db');
  console.log(`📂 Lendo banco SQLite: ${dbPath}`);
  
  const sqlite = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // 2. Conectar ao PostgreSQL
  const pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });

  try {
    // --- CRIAÇÃO DE TABELAS ---
    console.log('🏗️  Criando tabelas no PostgreSQL...');

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        type TEXT,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        path TEXT NOT NULL,
        type TEXT,
        size INTEGER,
        user_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

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
      );
    `);

    // --- MIGRAÇÃO DE DADOS ---

    // 1. Users
    const users = await sqlite.all('SELECT * FROM users');
    console.log(`👤 Migrando ${users.length} usuários...`);
    for (const user of users) {
      await pgPool.query(
        `INSERT INTO users (username, password, role, created_at) 
         VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
        [user.username, user.password, user.role, new Date(user.created_at)]
      );
    }

    // 2. Settings
    const settings = await sqlite.all('SELECT * FROM settings');
    console.log(`⚙️  Migrando ${settings.length} configurações...`);
    for (const setting of settings) {
      await pgPool.query(
        `INSERT INTO settings (key, value, type, description, updated_at) 
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [setting.key, setting.value, setting.type, setting.description, new Date(setting.updated_at || Date.now())]
      );
    }

    // 3. Images
    // Verifica se a tabela images existe no SQLite antes de tentar ler
    const hasImagesTable = await sqlite.get("SELECT name FROM sqlite_master WHERE type='table' AND name='images'");
    if (hasImagesTable) {
      const images = await sqlite.all('SELECT * FROM images');
      console.log(`🖼️  Migrando ${images.length} imagens...`);
      for (const img of images) {
        await pgPool.query(
          `INSERT INTO images (filename, path, type, size, user_id, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [img.filename, img.path, img.type, img.size, img.user_id, new Date(img.created_at)]
        );
      }
    }

    // 4. Posts
    const hasPostsTable = await sqlite.get("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'");
    if (hasPostsTable) {
      const posts = await sqlite.all('SELECT * FROM posts');
      console.log(`📝 Migrando ${posts.length} posts...`);
      for (const post of posts) {
        // Converte 0/1 do SQLite para boolean do Postgres
        const published = post.published === 1 || post.published === true;
        
        await pgPool.query(
          `INSERT INTO posts (title, slug, excerpt, content, image_url, published, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (slug) DO NOTHING`,
          [
            post.title, 
            post.slug, 
            post.excerpt, 
            post.content, 
            post.image_url, 
            published, 
            new Date(post.created_at), 
            new Date(post.updated_at)
          ]
        );
      }
    }

    console.log('✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    await sqlite.close();
    await pgPool.end();
  }
}

migrate();