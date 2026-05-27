-- Migration 003: Adiciona índices para otimização de performance
-- 
-- Problema identificado:
-- - Consultas com LIKE %term% em LOWER(title) e LOWER(content) causam full table scan
-- - Paginação sem índices adequados causa lentidão sob carga
-- - Settings sem índice na coluna key
--
-- Solução:
-- - Índice GIN para busca full-text em português (mais rápido que LIKE)
-- - Índice composto para paginação eficiente (published + position + created_at)
-- - Índice funcional para LOWER(title) (busca case-insensitive)
-- - Índice para settings.key

BEGIN;

-- =============================================
-- Índices para a tabela posts
-- =============================================

-- 1. Índice GIN para full-text search (português)
-- Usado quando a busca é feita via to_tsvector / plainto_tsquery
-- Cobre tanto title quanto content em português
CREATE INDEX IF NOT EXISTS idx_posts_fulltext_pt 
  ON posts 
  USING GIN (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(content, '')));

-- 2. Índice composto para paginação eficiente
-- Cobre o ORDER BY position ASC, created_at DESC com filtro published = true
CREATE INDEX IF NOT EXISTS idx_posts_pagination 
  ON posts (published, position, created_at DESC);

-- 3. Índice funcional para busca case-insensitive por título
-- Usado quando a busca é feita via LOWER(title) LIKE
CREATE INDEX IF NOT EXISTS idx_posts_lower_title 
  ON posts (LOWER(title));

-- 4. Índice para busca por slug (já existente, mas garantimos)
CREATE INDEX IF NOT EXISTS idx_posts_slug 
  ON posts (slug);

-- =============================================
-- Índices para a tabela settings
-- =============================================

-- 5. Índice para busca rápida por key
CREATE INDEX IF NOT EXISTS idx_settings_key 
  ON settings (key);

-- 6. Índice para listagem ordenada de settings
CREATE INDEX IF NOT EXISTS idx_settings_key_order 
  ON settings (key ASC);

-- =============================================
-- Índices para outras tabelas comuns
-- =============================================

-- 7. Índice para musicas (se existir a tabela)
CREATE INDEX IF NOT EXISTS idx_musicas_pagination 
  ON musicas (publicado, position, created_at DESC);

-- 8. Índice para videos (coluna se chama 'publicado' igual musicas)
CREATE INDEX IF NOT EXISTS idx_videos_pagination 
  ON videos (publicado, position, created_at DESC);

-- 9. Índice para products
CREATE INDEX IF NOT EXISTS idx_products_pagination 
  ON products (published, position, created_at DESC);

-- =============================================
-- Atualizar estatísticas do planner
-- =============================================
ANALYZE posts;
ANALYZE settings;
ANALYZE musicas;
ANALYZE videos;
ANALYZE products;

COMMIT;

-- Rollback:
-- DROP INDEX IF EXISTS idx_posts_fulltext_pt;
-- DROP INDEX IF EXISTS idx_posts_pagination;
-- DROP INDEX IF EXISTS idx_posts_lower_title;
-- DROP INDEX IF EXISTS idx_posts_slug;
-- DROP INDEX IF EXISTS idx_settings_key;
-- DROP INDEX IF EXISTS idx_settings_key_order;
-- DROP INDEX IF EXISTS idx_musicas_pagination;
-- DROP INDEX IF EXISTS idx_videos_pagination;
-- DROP INDEX IF EXISTS idx_products_pagination;