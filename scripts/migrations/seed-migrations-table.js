#!/usr/bin/env node
import { loadEnv } from '../utils/load-env.js';
import { getPool, closePool } from '../db/connection.js';

loadEnv();

const MIGRATION_TABLE = '_migrations';

/**
 * ATENÇÃO — lista mantida MANUALMENTE (não é derivada de `scripts/migrations/*.js`).
 *
 * Este script é um BYPASS: marca migrações como aplicadas em `_migrations` SEM
 * executá-las. Existe apenas para bancos pré-existentes que já tinham o schema
 * aplicado antes do sistema de controle de versionamento.
 *
 * A lista está deliberadamente defasada: `017-add-thumbnail-to-videos` e
 * `018-seed-default-roles` existem como arquivos em `scripts/migrations/`, mas
 * NÃO constam aqui.
 *
 * NÃO adicione migrações novas nesta lista:
 * - Registrar `018-seed-default-roles` aqui declararia o seed dos cargos
 *   ('admin'/'user') como "feito" num banco com a tabela `roles` vazia — exatamente
 *   o bug que a 018 existe para corrigir (o auto-criamento/DML no path de request
 *   de `pages/api/admin/roles.js` foi removido);
 * - o mesmo vale para qualquer migração futura: marcar sem executar esconde o
 *   trabalho pendente de `node scripts/migrate.js`.
 *
 * Migração nova = executar com `node scripts/migrate.js` (README, "Instalação e
 * Migrações"); depois, `verify-applied.js` confirma o efeito no banco.
 */
const MIGRATIONS = [
  '000-create-base-schema',
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
  '012-add-performance-indexes',
  '013-add-trgm-indexes',
  '014-add-dicas-index',
  '015-align-products-schema',
  '016-create-refresh-tokens-table',
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