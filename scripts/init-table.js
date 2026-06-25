#!/usr/bin/env node

import { loadEnv, requireDatabaseUrl } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';
import {
  getTableName,
  loadSchemaFromDir,
  buildCreateTableSQL,
  buildSeedSQL,
  validateIdentifier
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
  // Valida o identificador da tabela antes de qualquer interpolação SQL
  const safeTableName = validateIdentifier(schema.table, 'nome da tabela');

  if (schema.dropBeforeCreate) {
    console.log(`⚠️  Removendo tabela "${safeTableName}" se existir...`);
    await query(`DROP TABLE IF EXISTS ${safeTableName} CASCADE;`);
  }

  const createSQL = buildCreateTableSQL(schema, safeTableName);
  console.log(`🚀 Criando tabela "${safeTableName}"...`);
  await query(createSQL);
  console.log(`✅ Tabela "${safeTableName}" criada com sucesso!`);

  // Adiciona colunas extras que podem não existir de versões anteriores
  if (!schema.dropBeforeCreate) {
    for (const col of schema.columns) {
      if (col.name === 'id') continue; // id sempre existe
      const constraints = col.constraints || '';
      // Só adiciona colunas que têm DEFAULT ou são nullable (evita erro em NOT NULL sem DEFAULT)
      if (constraints.includes('DEFAULT') || !constraints.includes('NOT NULL')) {
        const defaultPart = constraints.includes('DEFAULT') ? ` ${constraints}` : '';
        await query(
          `ALTER TABLE ${safeTableName} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${defaultPart};`
        );
      }
    }
  }

  // Popula seedData se houver
  const seedSQL = buildSeedSQL(schema, safeTableName);
  if (seedSQL) {
    const check = await query(`SELECT count(*) as count FROM ${safeTableName}`);
    const rowCount = parseInt(check.rows[0].count, 10);
    if (rowCount === 0) {
      console.log(`📝 Populando tabela "${safeTableName}" com dados iniciais...`);
      await query(seedSQL);
      console.log(`✅ Dados iniciais inseridos em "${safeTableName}".`);
    } else {
      console.log(`⏭️  Tabela "${safeTableName}" já contém dados. Seed ignorado.`);
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