#!/usr/bin/env node
import { loadEnv } from '../utils/load-env.js';
loadEnv();

import { getPool, closePool } from '../db/connection.js';

const MIGRATION_NAME = '004-add-published-to-products';

export async function up(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Adicionando coluna "published" à tabela "products"...`);
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;');
  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

export async function down(pool) {
  console.log(`   ↳ ${MIGRATION_NAME}: Removendo coluna "published" da tabela "products"...`);
  await pool.query('ALTER TABLE products DROP COLUMN IF EXISTS published;');
  console.log(`   ✅ ${MIGRATION_NAME} (down) concluída.`);
}

if (process.argv[1] && process.argv[1].endsWith('004-add-published-to-products.js')) {
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