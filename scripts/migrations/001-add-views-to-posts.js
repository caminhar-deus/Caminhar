#!/usr/bin/env node
import { loadEnv } from '../utils/load-env.js';
loadEnv();

import { getPool, closePool } from '../db/connection.js';

const MIGRATION_NAME = '001-add-views-to-posts';

export async function up(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Adicionando coluna "views" à tabela "posts"...`);
  await pool.query(`
    ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0 NOT NULL;
  `);
  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

export async function down(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Removendo coluna "views" da tabela "posts"...`);
  await pool.query('ALTER TABLE posts DROP COLUMN IF EXISTS views;');
  console.log(`   ✅ ${MIGRATION_NAME} (down) concluída.`);
}

// Execução direta quando o script é chamado individualmente
if (process.argv[1] && process.argv[1].endsWith('001-add-views-to-posts.js')) {
  (async () => {
    const pool = getPool();
    try {
      await up(pool);
    } catch (error) {
      console.error(`❌ Erro em ${MIGRATION_NAME}:`, error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}