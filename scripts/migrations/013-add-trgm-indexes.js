#!/usr/bin/env node

/**
 * Migration 013: Adiciona índices GIN trigram para busca textual eficiente
 * 
 * Problema:
 * - Consultas com "ILIKE '%termo%'" em musicas, videos e posts causam full table scan
 * - Sem índices trigram, o P95 das buscas ultrapassa 950ms
 * 
 * Solução:
 * - Habilitar extensão pg_trgm
 * - Criar índices GIN trigram nas colunas de texto usadas em buscas ILIKE
 * - Índices trigram suportam wildcard duplo (%termo%) ao contrário de B-tree
 */

const SQL = `
-- Migration 013: Adiciona índices GIN trigram para busca textual eficiente

BEGIN;

-- 1. Habilitar extensão pg_trgm (se não existir)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índices trigram para tabela musicas
CREATE INDEX IF NOT EXISTS idx_musicas_titulo_trgm
  ON musicas
  USING gin (titulo gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_musicas_artista_trgm
  ON musicas
  USING gin (artista gin_trgm_ops);

-- 3. Índices trigram para tabela videos
CREATE INDEX IF NOT EXISTS idx_videos_titulo_trgm
  ON videos
  USING gin (titulo gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_videos_descricao_trgm
  ON videos
  USING gin (descricao gin_trgm_ops);

-- 4. Índices trigram para tabela posts (complementar ao GIN full-text)
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm
  ON posts
  USING gin (title gin_trgm_ops);

-- 5. Atualizar estatísticas do planner
ANALYZE musicas;
ANALYZE videos;
ANALYZE posts;

COMMIT;
`;

const ROLLBACK_SQL = `
DROP INDEX IF EXISTS idx_musicas_titulo_trgm;
DROP INDEX IF EXISTS idx_musicas_artista_trgm;
DROP INDEX IF EXISTS idx_videos_titulo_trgm;
DROP INDEX IF EXISTS idx_videos_descricao_trgm;
DROP INDEX IF EXISTS idx_posts_title_trgm;
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