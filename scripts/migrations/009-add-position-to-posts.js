#!/usr/bin/env node
import { loadEnv } from '../utils/load-env.js';
loadEnv();

import { getPool, closePool } from '../db/connection.js';

const MIGRATION_NAME = '009-add-position-to-posts';

export async function up(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Adicionando coluna "position" à tabela "posts"...`);
  await pool.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 9999;');
  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

export async function down(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Removendo coluna "position" da tabela "posts"...`);
  await pool.query('ALTER TABLE posts DROP COLUMN IF EXISTS position;');
  console.log(`   ✅ ${MIGRATION_NAME} (down) concluída.`);
}

if (process.argv[1] && process.argv[1].endsWith('009-add-position-to-posts.js')) {
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