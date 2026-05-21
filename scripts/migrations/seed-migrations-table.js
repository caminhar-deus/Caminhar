#!/usr/bin/env node
import { loadEnv } from '../utils/load-env.js';
import { getPool, closePool } from '../db/connection.js';

loadEnv();

const MIGRATION_TABLE = '_migrations';
const MIGRATIONS = [
  '001-add-views-to-posts',
  '002-create-products-table',
  '003-add-position-to-products',
  '004-add-published-to-products',
  '005-add-last-login-to-users',
  '006-create-activity-logs',
  '007-add-position-to-musicas',
  '008-add-position-to-videos',
  '009-add-position-to-posts',
  '011-fix-entity-id-type',
];

async function seed() {
  const pool = getPool();

  console.log('\n📦 Populando tabela _migrations com migrações já aplicadas...\n');

  // Garante que a tabela existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Verifica quais já estão registradas
  const existing = await pool.query(`SELECT name FROM ${MIGRATION_TABLE}`);
  const existingNames = new Set(existing.rows.map(r => r.name));

  let inserted = 0;
  let skipped = 0;

  for (const name of MIGRATIONS) {
    if (existingNames.has(name)) {
      console.log(`   ⏭️  ${name} — já registrada`);
      skipped++;
    } else {
      await pool.query(
        `INSERT INTO ${MIGRATION_TABLE} (name) VALUES ($1)`,
        [name]
      );
      console.log(`   ✅  ${name} — registrada`);
      inserted++;
    }
  }

  console.log('\n─'.repeat(50));
  console.log(`   📊 Registradas: ${inserted} | Já existentes: ${skipped} | Total: ${MIGRATIONS.length}`);

  if (inserted > 0) {
    console.log('\n🎉 Tabela _migrations populada com sucesso!');
    console.log('   Agora "node scripts/migrate.js --status" mostrará todas como ✅ Aplicada.\n');
  } else {
    console.log('\nℹ️  Todas as migrações já estavam registradas. Nenhuma ação necessária.\n');
  }

  await closePool();
}

seed();