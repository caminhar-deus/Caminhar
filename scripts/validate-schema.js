import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

// Carrega variáveis de ambiente
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// Definição do Schema Esperado com base no código (lib/db.js, lib/auth.js, migrations)
const EXPECTED_SCHEMA = {
  posts: [
    'id', 'title', 'slug', 'excerpt', 'content', 'image_url', 'published', 'created_at', 'updated_at', 'views'
  ],
  videos: [
    'id', 'titulo', 'url_youtube', 'descricao', 'publicado', 'created_at', 'updated_at'
  ],
  musicas: [
    'id', 'titulo', 'artista', 'url_spotify', 'descricao', 'publicado', 'created_at', 'updated_at'
  ],
  users: [
    'id', 'username', 'password', 'role', 'created_at'
  ],
  // Tabelas inferidas pelo uso em lib/db.js
  settings: [
    'key', 'value', 'type', 'description', 'updated_at'
  ],
  images: [
    'id', 'filename', 'path', 'type', 'size', 'user_id'
  ]
};

async function validateSchema() {
  console.log('🔍 Validando schema do banco de dados...');
  let hasErrors = false;

  try {
    // Verifica conexão
    await pool.query('SELECT 1');

    for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
      // 1. Verificar se a tabela existe
      const tableRes = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
        [tableName]
      );

      if (!tableRes.rows[0].exists) {
        console.error(`❌ Tabela faltando: '${tableName}'`);
        hasErrors = true;
        continue;
      }

      // 2. Verificar colunas
      const columnsRes = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
        [tableName]
      );

      const existingColumns = columnsRes.rows.map(row => row.column_name);
      const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length > 0) {
        console.error(`❌ Colunas faltando na tabela '${tableName}': ${missingColumns.join(', ')}`);
        hasErrors = true;
      } else {
        console.log(`✅ Tabela '${tableName}': OK`);
      }
    }

    console.log('-----------------------------------------');
    if (hasErrors) {
      console.error('⚠️  O banco de dados apresenta inconsistências com o código.');
      console.error('   Sugestão: Execute as migrações ou scripts de inicialização (npm run init-db, npm run migrate).');
      process.exit(1);
    } else {
      console.log('✨ O banco de dados está sincronizado com o schema esperado.');
    }

  } catch (error) {
    console.error('❌ Erro fatal ao validar schema:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

validateSchema();