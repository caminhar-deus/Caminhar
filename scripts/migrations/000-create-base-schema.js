#!/usr/bin/env node

/**
 * Migration 000: Cria o schema base do banco de dados
 *
 * Problema:
 * - As migrações 001-016 são incrementais e pressupõem que as tabelas base
 *   (posts, videos, musicas, dicas, users etc.) já existam.
 * - Em um banco recém-criado (vazio), a primeira execução de `npm run migrate`
 *   falhava com `relation "posts" does not exist`.
 *
 * Solução:
 * - Consolidar o bootstrap do schema (antes distribuído entre o script
 *   `init-table.js`, a migração removida `010-sync-sqlite-pg-schemas` e o
 *   `initializeAuth` de `lib/auth/auth.js`) em uma única migração idempotente,
 *   que roda antes de todas as demais.
 * - Todas as tabelas usam `CREATE TABLE IF NOT EXISTS` para não conflitar com
 *   bancos que já possuem o schema.
 *
 * Tabelas criadas:
 * - Conteúdo (reaproveitando `scripts/schemas/*.json`): posts, videos, musicas, dicas
 * - Auxiliares: users, settings, images, categories, tags, post_categories, post_tags, roles
 */

import { buildCreateTableSQL, loadSchemaFromDir } from '../utils/init-table-utils.js';

const SCHEMAS_DIR = new URL('../schemas', import.meta.url).pathname;

const CONTENT_TABLES = ['posts', 'videos', 'musicas', 'dicas'];

const AUXILIAR_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  size INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS post_categories (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

const ROLLBACK_SQL = `
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS post_categories CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS dicas CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS musicas CASCADE;
`;

/**
 * Aplica a migração.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function up(client) {
  for (const table of CONTENT_TABLES) {
    const schema = loadSchemaFromDir(table, SCHEMAS_DIR);
    await client.query(buildCreateTableSQL(schema, schema.table));
  }

  await client.query(AUXILIAR_SQL);
}

/**
 * Reverte a migração.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function down(client) {
  await client.query(ROLLBACK_SQL);
}