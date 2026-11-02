#!/usr/bin/env node

const MIGRATION_NAME = '021-videos-public-sort-support';

/**
 * Migration 021: suporte de banco à ordenação pública de vídeos (item AE).
 *
 * 1. Índice para `recent`/`oldest`.
 *    A migration 012 criou `idx_videos_pagination (published, position,
 *    created_at DESC)` para o default antigo `position ASC, created_at DESC`.
 *    Desde o ADR-0014 a rota `/api/videos` nunca mais envia essa ordem: manda
 *    `created_at DESC, id DESC` (recent) ou `created_at ASC, id ASC` (oldest).
 *    Medido em 50 000 linhas (PostgreSQL 18, EXPLAIN ANALYZE): com o índice
 *    antigo, ambas viravam Seq Scan + top-N heapsort (715 buffers, 13–18 ms);
 *    com `idx_videos_recent`, `recent` é Index Scan e `oldest` é Index Scan
 *    Backward do MESMO índice (o desempate por `id` está na chave).
 *    `idx_videos_pagination` é MANTIDO de propósito: ele ainda serve
 *    `positioned` (`position ASC, id ASC`) via Incremental Sort (3 buffers,
 *    0,18 ms medidos) — um segundo índice só para `positioned` seria
 *    redundante.
 *
 * 2. Extensão `unaccent`, para o A-Z/Z-A de `/api/videos`.
 *    `ORDER BY titulo` herda a colação do cluster; em `C`/`C.UTF-8` as
 *    maiúsculas vêm antes das minúsculas e os acentuados vão para o fim. A
 *    rota passou a ordenar por `lower(unaccent(titulo))`, que não depende da
 *    colação (a ordem `unaccent(lower(...))` NÃO serve: em cluster `C` puro o
 *    `lower()` não minusculiza `É`/`Á`). A extensão é *trusted* desde o
 *    PostgreSQL 13 (mesmo caso do `pg_trgm` da migration 013), e falhar aqui
 *    é melhor do que falhar no tráfego do visitante.
 *
 * Idempotente (`IF NOT EXISTS`). Deploy: rodar `npm run migrate` ANTES de
 * colocar no ar o código que usa `unaccent` (sem a extensão, `sort=alpha` e
 * `sort=alpha_desc` respondem 500; `recent`, `oldest` e `positioned` não
 * dependem dela).
 */
const SQL = `
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE INDEX IF NOT EXISTS idx_videos_recent
  ON videos (published, created_at DESC, id DESC);

ANALYZE videos;
`;

// A extensão NÃO é removida no rollback: outros objetos podem passar a
// depender dela e a migration 013 também deixa o `pg_trgm` instalado.
const ROLLBACK_SQL = `
DROP INDEX IF EXISTS idx_videos_recent;
`;

/**
 * Aplica a migração.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function up(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: extensão unaccent + índice idx_videos_recent...`);
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
