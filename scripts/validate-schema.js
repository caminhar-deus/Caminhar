#!/usr/bin/env node
import { loadEnv } from './utils/load-env.js';
import { getPool, closePool } from './db/connection.js';

loadEnv();

// Definição do Schema Esperado, fiel ao estado real do banco (conferido no
// information_schema em 27/10/2026): colunas estruturais das migrations
// (position em posts/musicas/videos — 007/008/009; thumbnail em videos — 017;
// last_login_at em users — 005) e as tabelas de products/dicas (que não têm
// schema JSON) e auxiliares do schema base (000).
// ATENÇÃO: a coluna de publicação é `published` em TODAS as tabelas
// (unificação `publicado`→`published` pela migration 020 — ADR-0029).
// (exportado para o teste de consistência de fontes de schema —
// tests/unit/scripts/schema-sources.test.js)
export const EXPECTED_SCHEMA = {
  posts: [
    'id', 'title', 'slug', 'excerpt', 'content', 'image_url', 'published', 'views', 'position', 'created_at', 'updated_at'
  ],
  videos: [
    'id', 'titulo', 'url_youtube', 'descricao', 'thumbnail', 'published', 'position', 'created_at', 'updated_at'
  ],
  musicas: [
    'id', 'titulo', 'artista', 'url_spotify', 'descricao', 'published', 'position', 'created_at', 'updated_at'
  ],
  products: [
    'id', 'name', 'price', 'image_url', 'description', 'position', 'published', 'category', 'link', 'created_at', 'updated_at'
  ],
  dicas: [
    'id', 'name', 'content', 'published', 'created_at', 'updated_at'
  ],
  categories: [
    'id', 'name', 'slug'
  ],
  tags: [
    'id', 'name', 'slug'
  ],
  post_categories: [
    'post_id', 'category_id'
  ],
  post_tags: [
    'post_id', 'tag_id'
  ],
  roles: [
    'id', 'name', 'permissions', 'created_at', 'updated_at'
  ],
  users: [
    'id', 'username', 'password', 'role', 'last_login_at', 'created_at', 'updated_at'
  ],
  refresh_tokens: [
    'id', 'user_id', 'token', 'expires_at', 'revoked', 'created_at'
  ],
  // Tabelas inferidas pelo uso em lib/infra/db.js
  settings: [
    'id', 'key', 'value', 'type', 'description', 'created_at', 'updated_at'
  ],
  images: [
    'id', 'filename', 'path', 'type', 'size', 'user_id', 'uploaded_at'
  ]
};

async function validateSchema() {
  console.log('🔍 Validando schema do banco de dados...');
  let hasErrors = false;
  const pool = getPool();

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
    } else {
      console.log('✨ O banco de dados está sincronizado com o schema esperado.');
    }

    return !hasErrors;

  } catch (error) {
    console.error('❌ Erro fatal ao validar schema:', error.message);
    return false;

  } finally {
    await closePool();
  }
}

export { validateSchema };
