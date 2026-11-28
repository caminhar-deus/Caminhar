#!/usr/bin/env node

const MIGRATION_NAME = '024-customer-refresh-tokens-indexes';

/**
 * Migration 024: índices de apoio à tabela `customer_refresh_tokens`.
 *
 * Complementa a migration 023 (que criou apenas PK em `id` e UNIQUE em `token`):
 * - `idx_customer_refresh_tokens_customer_id`: acelera revogação em lote por
 *   visitante (`revokeAllCustomerRefreshTokens`, ex.: vínculo Google em conta
 *   pré-existente com senha) e exclusões em cascata (`ON DELETE CASCADE`).
 * - `idx_customer_refresh_tokens_expires_at`: acelera varreduras futuras de
 *   limpeza/expurgo de tokens expirados.
 *
 * Sem `BEGIN`/`COMMIT` internos pois `scripts/migrate.js` já abre transação.
 */
const UP_SQL = `
CREATE INDEX IF NOT EXISTS idx_customer_refresh_tokens_customer_id
  ON customer_refresh_tokens (customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_refresh_tokens_expires_at
  ON customer_refresh_tokens (expires_at);

ANALYZE customer_refresh_tokens;
`;

const DOWN_SQL = `
DROP INDEX IF EXISTS idx_customer_refresh_tokens_expires_at;
DROP INDEX IF EXISTS idx_customer_refresh_tokens_customer_id;
`;

/**
 * Aplica a migração.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function up(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: criando índices em customer_refresh_tokens...`);
  await client.query(UP_SQL);
  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

/**
 * Reverte a migração.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function down(client) {
  await client.query(DOWN_SQL);
}
