#!/usr/bin/env node

/**
 * Migration 014: Adiciona índice composto para paginação eficiente em dicas
 * 
 * Problema:
 * - Consultas com "WHERE published = true ORDER BY id ASC" em dicas causam full table scan
 * - Sem índice composto, o P95 das consultas ultrapassa 1000ms
 * 
 * Solução:
 * - Criar índice composto (published, id ASC) para a query de listagem pública
 */

const SQL = `
-- Migration 014: Adiciona índice composto para paginação eficiente em dicas

BEGIN;

-- Índice composto para a query de listagem pública (WHERE published = true ORDER BY id ASC)
CREATE INDEX IF NOT EXISTS idx_dicas_published_id
  ON dicas (published, id ASC);

-- Atualizar estatísticas do planner
ANALYZE dicas;

COMMIT;
`;

const ROLLBACK_SQL = `
DROP INDEX IF EXISTS idx_dicas_published_id;
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