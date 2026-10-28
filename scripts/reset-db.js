#!/usr/bin/env node

import { loadEnv, requireDatabaseUrl } from './utils/load-env.js';
import { query, getPool, closePool } from './db/connection.js';
import { ensureMigrationTable, run } from './migrate.js';

loadEnv();
requireDatabaseUrl();

/**
 * Reset COMPLETO e coerente das tabelas de conteúdo (npm run db:reset).
 *
 * Por que não basta recriar pelos schemas JSON (comportamento anterior)?
 * As migrations estruturais (position — 007/008/009; índices — 012/013/014)
 * ficavam marcadas como aplicadas em `_migrations` e NÃO reaplicavam após o
 * reset, deixando as tabelas sem colunas/índices que o código exige. Além
 * disso, o `DROP TABLE ... CASCADE` destrói as FKs de post_categories/post_tags
 * (que referenciam posts), e nenhuma migration as recria.
 *
 * A solução: dropar conteúdo + auxiliares, limpar `_migrations` por inteiro e
 * reaplicar TODAS as migrations — todas são idempotentes (`IF NOT EXISTS` /
 * `ON CONFLICT`, conferido em 27/10/2026). A migration 000 recria as tabelas de
 * conteúdo a partir de `scripts/schemas/` e as auxiliares com as FKs originais.
 *
 * NÃO dropa: `products` (sem schema JSON; dados preservados — como no reset
 * anterior), `users`, `settings`, `images`, `roles`, `activity_logs`,
 * `refresh_tokens` (bootstrap/infra, recriadas pelo `db:init` e pela 000 quando
 * ausentes).
 *
 * Os nomes abaixo são literais fixos (sem input externo), por isso dispensam
 * `validateIdentifier`.
 */
const TABLES_TO_DROP = [
  // Junctions primeiro (referenciam posts/categories/tags)
  'post_tags',
  'post_categories',
  'tags',
  'categories',
  // Conteúdo com schema JSON (a migration 000 recria a partir de scripts/schemas/)
  'dicas',
  'videos',
  'musicas',
  'posts',
];

/**
 * Executa o reset: drop → limpa _migrations → reaplica todas as migrations.
 */
export async function resetDb() {
  console.log('🔄 Reset completo das tabelas de conteúdo e auxiliares...');

  for (const table of TABLES_TO_DROP) {
    await query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    console.log(`   ↳ dropped ${table}`);
  }

  // Garante que a tabela de controle existe antes de limpar (primeira execução)
  await ensureMigrationTable(getPool());
  await query('DELETE FROM _migrations;');
  console.log('   ↳ _migrations limpa — todas as migrations serão reaplicadas');

  await run();

  console.log('✅ Reset concluído. Rode `npm run db:init` para recriar o usuário admin.');
}

// Executa apenas quando chamado diretamente pela CLI (padrão de migrate.js —
// comparação por sufixo de caminho, sem `import.meta`, que o babel-jest não
// transforma e quebraria o import em testes).
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('/scripts/reset-db.js') ||
  process.argv[1].endsWith('\\scripts\\reset-db.js')
);

if (isMainModule) {
  resetDb()
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erro durante o reset:', error.message);
      return closePool().finally(() => process.exit(1));
    });
}
