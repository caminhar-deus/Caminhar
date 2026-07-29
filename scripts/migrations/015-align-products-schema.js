#!/usr/bin/env node

/**
 * Migration 015: Alinha o schema da tabela products com o schema esperado pelo código
 * 
 * Problema:
 * - O código JS espera as colunas: name, image_url, category, link
 * - O banco possui as colunas: title, images, link_ml, link_shopee, link_amazon
 * - Isso causa erro "column 'name' does not exist" nas buscas com ILIKE
 * 
 * Alterações:
 * - Renomeia title → name
 * - Renomeia images → image_url
 * - Adiciona coluna category com default 'geral'
 * - Unifica link_ml, link_shopee, link_amazon em link (prioridade: ML > Shopee > Amazon)
 * - Atualiza updated_at para CURRENT_TIMESTAMP
 */

const SQL = `
-- Migration 015: Alinha schema da tabela products

BEGIN;

-- 1. Renomear title → name
ALTER TABLE products RENAME COLUMN title TO name;

-- 2. Renomear images → image_url
ALTER TABLE products RENAME COLUMN images TO image_url;

-- 3. Adicionar coluna category com default
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'geral';

-- 4. Unificar links em uma única coluna (prioridade: ML > Shopee > Amazon)
ALTER TABLE products ADD COLUMN IF NOT EXISTS link TEXT;
UPDATE products SET link = COALESCE(NULLIF(link_ml, ''), NULLIF(link_shopee, ''), NULLIF(link_amazon, ''), '');
ALTER TABLE products DROP COLUMN IF EXISTS link_ml;
ALTER TABLE products DROP COLUMN IF EXISTS link_shopee;
ALTER TABLE products DROP COLUMN IF EXISTS link_amazon;

-- 5. Atualizar timestamp dos registros existentes
UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

COMMIT;
`;

const ROLLBACK_SQL = `
BEGIN;

-- Reverter: adicionar colunas antigas
ALTER TABLE products ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS link_ml TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS link_shopee TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS link_amazon TEXT DEFAULT '';

-- Copiar dados de volta
UPDATE products SET title = name, images = image_url;
UPDATE products SET link_ml = link WHERE link IS NOT NULL AND link != '';

-- Remover colunas novas
ALTER TABLE products DROP COLUMN IF EXISTS name;
ALTER TABLE products DROP COLUMN IF EXISTS image_url;
ALTER TABLE products DROP COLUMN IF EXISTS category;
ALTER TABLE products DROP COLUMN IF EXISTS link;

COMMIT;
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