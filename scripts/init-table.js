#!/usr/bin/env node

import { loadEnv, requireDatabaseUrl } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';
import {
  getTableName,
  loadSchemaFromDir,
  buildCreateTableSQL,
  buildSeedSQL
} from './utils/init-table-utils.js';

loadEnv();
requireDatabaseUrl();

/**
 * Carrega o schema da tabela a partir do diretório scripts/schemas/.
 * Usa import.meta.url para resolver o caminho absoluto dos schemas.
 *
 * @param {string} tableName - Nome da tabela
 * @returns {Object} Schema da tabela
 */
function loadSchema(tableName) {
  const schemasDir = new URL('./schemas', import.meta.url).pathname;
  return loadSchemaFromDir(tableName, schemasDir);
}

/**
 * Cria a tabela conforme o schema. Opcionalmente faz drop antes e popula seedData.
 *
 * @param {Object} schema - Schema da tabela
 */
async function initTable(schema) {
  if (schema.dropBeforeCreate) {
    console.log(`⚠️  Removendo tabela "${schema.table}" se existir...`);
    await query(`DROP TABLE IF EXISTS ${schema.table} CASCADE;`);
  }

  const createSQL = buildCreateTableSQL(schema);
  console.log(`🚀 Criando tabela "${schema.table}"...`);
  await query(createSQL);
  console.log(`✅ Tabela "${schema.table}" criada com sucesso!`);

  // Adiciona colunas extras que podem não existir de versões anteriores
  if (!schema.dropBeforeCreate) {
    for (const col of schema.columns) {
      if (col.name === 'id') continue; // id sempre existe
      const constraints = col.constraints || '';
      // Só adiciona colunas que têm DEFAULT ou são nullable (evita erro em NOT NULL sem DEFAULT)
      if (constraints.includes('DEFAULT') || !constraints.includes('NOT NULL')) {
        const defaultPart = constraints.includes('DEFAULT') ? ` ${constraints}` : '';
        await query(
          `ALTER TABLE ${schema.table} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${defaultPart};`
        );
      }
    }
  }

  // Popula seedData se houver
  const seedSQL = buildSeedSQL(schema);
  if (seedSQL) {
    const check = await query(`SELECT count(*) as count FROM ${schema.table}`);
    const rowCount = parseInt(check.rows[0].count, 10);
    if (rowCount === 0) {
      console.log(`📝 Populando tabela "${schema.table}" com dados iniciais...`);
      await query(seedSQL);
      console.log(`✅ Dados iniciais inseridos em "${schema.table}".`);
    } else {
      console.log(`⏭️  Tabela "${schema.table}" já contém dados. Seed ignorado.`);
    }
  }
}

async function main() {
  const tableName = getTableName();
  const schema = loadSchema(tableName);

  try {
    await initTable(schema);
    console.log(`🎉 Tabela "${schema.table}" inicializada com sucesso!`);
  } catch (error) {
    console.error(`❌ Erro ao inicializar tabela "${schema.table}":`, error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();