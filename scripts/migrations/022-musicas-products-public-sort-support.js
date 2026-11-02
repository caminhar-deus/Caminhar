#!/usr/bin/env node

const MIGRATION_NAME = '022-musicas-products-public-sort-support';

/**
 * Migration 022: suporte de banco à ordenação pública de músicas e produtos (item AF).
 *
 * 1. Índices para `default` (`created_at DESC, id DESC`) e `oldest`
 *    (`created_at ASC, id ASC`) em `musicas` e `products`.
 *    A migration 012 criou `idx_musicas_pagination` e `idx_products_pagination`
 *    com chave `(published, position, created_at DESC)` para o default antigo
 *    `position ASC, created_at DESC`. Desde o ADR-0014 e o ADR-0016, o default
 *    público das duas rotas é `created_at DESC, id DESC` e o inverso é
 *    `created_at ASC, id ASC`. Como `position` fica entre `published` e
 *    `created_at`, o índice da 012 não evita a ordenação nessas duas opções.
 *    Medido em 50 000 linhas por tabela (PostgreSQL 18.6, EXPLAIN ANALYZE):
 *    - `musicas`: de Seq Scan + top-N heapsort (1 315 buffers, ~32–34 ms) para
 *      Index Scan / Index Scan Backward em `idx_musicas_recent` (4 buffers, ~0,2 ms).
 *    - `products`: de Seq Scan + top-N heapsort (1 785 buffers, ~32–37 ms) para
 *      Index Scan / Index Scan Backward em `idx_products_recent` (4–5 buffers, ~0,07–0,09 ms).
 *    `idx_musicas_pagination` e `idx_products_pagination` são MANTIDOS de
 *    propósito: ambos continuam servindo `positioned` (`position ASC, id ASC`)
 *    via Incremental Sort (3 buffers, ~0,09 ms medidos).
 *
 * 2. Extensão `unaccent` (idempotente com a migration 021).
 *    Garante que `lower(unaccent(titulo))` em `/api/musicas?sort=alpha|alpha_desc`
 *    esteja disponível mesmo se a 022 for inspecionada isoladamente.
 *
 * Idempotente (`IF NOT EXISTS`). Deploy: rodar `npm run migrate` antes de
 * colocar o código no ar em ambientes que ainda não tenham `unaccent`.
 */
const SQL = `
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE INDEX IF NOT EXISTS idx_musicas_recent
  ON musicas (published, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_products_recent
  ON products (published, created_at DESC, id DESC);

ANALYZE musicas;
ANALYZE products;
`;

// A extensão `unaccent` NÃO é removida no rollback: a migration 021 e
// `/api/videos` dependem dela (mesmo padrão de `pg_trgm` na migration 013).
const ROLLBACK_SQL = `
DROP INDEX IF EXISTS idx_musicas_recent;
DROP INDEX IF EXISTS idx_products_recent;
`;

/**
 * Aplica a migração.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function up(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: índices idx_musicas_recent e idx_products_recent...`);
  await client.query(SQL);
  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

/**
 * Reverte a migração.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function down(client) {
  await client.query(ROLLBACK_SQL);
}
