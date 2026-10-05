#!/usr/bin/env node

/**
 * Migration 018: Seeds the default roles ("admin", "user") and guarantees a
 * unique index on roles(name).
 *
 * Problema:
 * - A tabela roles é criada pela migração 000, mas permanece vazia: a
 *   migração 000 não insere os cargos padrão.
 * - pages/api/admin/roles.js só popula cargos no caminho de erro 42P01
 *   (tabela ausente), que nunca dispara porque a 000 já cria a tabela.
 *
 * Alterações:
 * - Cria idx_roles_name (índice único em roles(name)) de forma idempotente,
 *   viabilizando o upsert via ON CONFLICT (name): a coluna roles.name não
 *   tem constraint UNIQUE na migração 000, e sem índice único o Postgres
 *   responde 42P10 para ON CONFLICT (name). Se já existirem nomes
 *   duplicados, a criação do índice falha com erro claro (a migração inteira
 *   é revertida pela transação do migrate.js — não é silenciada).
 * - Faz upsert de admin (todas as permissões de lib/domain/permissions.js)
 *   e user (apenas "Visão Geral"), gravando permissions como string JSON
 *   (a coluna é TEXT, não JSONB — sem cast para jsonb).
 *
 * ⚠️ down() é DESTRUTIVO para esses dois cargos: apaga as linhas
 * 'admin' e 'user' da tabela roles e remove o índice idx_roles_name.
 * Rodar down() em um banco onde esses cargos foram customizados perde
 * essas customizações.
 */

import permissionsList from '../../lib/domain/permissions.js';
import { loadEnv } from '../utils/load-env.js';
import { getPool, closePool } from '../db/connection.js';

loadEnv();

const MIGRATION_NAME = '018-seed-default-roles';

// roles.permissions é TEXT NOT NULL DEFAULT '[]' (migração 000), então o
// valor precisa ser uma string JSON — não um objeto nem um cast jsonb.
const ADMIN_PERMISSIONS = JSON.stringify(permissionsList);
const USER_PERMISSIONS = JSON.stringify(['Visão Geral']);

/**
 * Aplica a migração.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function up(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: Criando índice único em roles(name)...`);
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name ON roles (name);');
  console.log(`   ✅ ${MIGRATION_NAME}: Índice idx_roles_name garantido.`);

  console.log(`   ↳ ${MIGRATION_NAME}: Inserindo cargos padrão ("admin", "user")...`);
  const result = await client.query(
    `INSERT INTO roles (name, permissions) VALUES ('admin', $1), ('user', $2)
     ON CONFLICT (name) DO UPDATE
       SET permissions = EXCLUDED.permissions,
           updated_at = CURRENT_TIMESTAMP`,
    [ADMIN_PERMISSIONS, USER_PERMISSIONS]
  );
  console.log(`   ✅ ${MIGRATION_NAME} concluída: ${result.rowCount} cargo(s) sembreado(s).`);
}

/**
 * Reverte a migração.
 * ⚠️ DESTRUTIVO: remove os cargos 'admin' e 'user' e o índice idx_roles_name.
 * @param {import('pg').PoolClient} client - Cliente PostgreSQL da transação
 */
export async function down(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: Removendo cargos padrão ("admin", "user") e índice idx_roles_name...`);
  await client.query(`DELETE FROM roles WHERE name IN ('admin', 'user');`);
  await client.query('DROP INDEX IF EXISTS idx_roles_name;');
  console.log(`   ✅ ${MIGRATION_NAME} (down) concluída.`);
}

if (process.argv[1] && process.argv[1].endsWith('018-seed-default-roles.js')) {
  (async () => {
    const pool = getPool();
    try {
      await up(pool);
    } catch (error) {
      console.error(`❌ Erro em ${MIGRATION_NAME}:`, error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}
