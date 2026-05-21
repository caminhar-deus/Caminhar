#!/usr/bin/env node
import { loadEnv } from '../utils/load-env.js';
loadEnv();

import { getPool, closePool } from '../db/connection.js';

const MIGRATION_NAME = '007-add-position-to-musicas';

export async function up(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Adicionando coluna "position" à tabela "musicas"...`);
  await pool.query('ALTER TABLE musicas ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 9999;');
  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

export async function down(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Removendo coluna "position" da tabela "musicas"...`);
  await pool.query('ALTER TABLE musicas DROP COLUMN IF EXISTS position;');
  console.log(`   ✅ ${MIGRATION_NAME} (down) concluída.`);
}

if (process.argv[1] && process.argv[1].endsWith('007-add-position-to-musicas.js')) {
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