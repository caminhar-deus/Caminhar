#!/usr/bin/env node

/**
 * Migration 016: Cria tabela de refresh_tokens para suporte a refresh token
 * 
 * Problema:
 * - A função storeRefreshToken em lib/auth.js tenta inserir em refresh_tokens
 * - A tabela nunca foi criada no banco (initializeAuth() não é chamada no startup)
 * - Isso causa erro "relation 'refresh_tokens' does not exist" no login
 * 
 * Alterações:
 * - Cria tabela refresh_tokens com FK para users(id)
 * - Cria índices para busca por token e por user_id
 */

const SQL = `
-- Migration 016: Cria tabela de refresh_tokens

BEGIN;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
  ON refresh_tokens(token);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens(user_id);

COMMIT;
`;

const ROLLBACK_SQL = `
DROP TABLE IF EXISTS refresh_tokens CASCADE;
`;

/**
 * Aplica a migração.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function up(client) {
  await client.query(SQL);
}

/**
 * Reverte a migração.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function down(client) {
  await client.query(ROLLBACK_SQL);
}