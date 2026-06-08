#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { loadEnv, requireDatabaseUrl } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';

loadEnv();
requireDatabaseUrl();

/**
 * Obtém o nome da tabela a partir dos argumentos da linha de comando.
 * Suporta: node init-table.js musicas | node init-table.js --table=musicas
 *
 * @returns {string} Nome da tabela
 */
function getTableName() {
  const args = process.argv.slice(2);

  // Formato: node init-table.js musicas
  if (args.length === 1 && !args[0].startsWith('--')) {
    return args[0];
  }

  // Formato: node init-table.js --table=musicas
  const tableArg = args.find(arg => arg.startsWith('--table='));
  if (tableArg) {
    return tableArg.split('=')[1];
  }

  // Formato: node init-table.js --table musicas
  const tableIndex = args.indexOf('--table');
  if (tableIndex !== -1 && args[tableIndex + 1]) {
    return args[tableIndex + 1];
  }

  throw new Error(
    'Uso: node scripts/init-table.js <nome_da_tabela>\n' +
    '     node scripts/init-table.js --table=<nome_da_tabela>\n' +
    '     node scripts/init-table.js --help\n' +
    '\nTabelas disponíveis: musicas, posts, videos, dicas'
  );
}

/**
 * Carrega o schema da tabela a partir do arquivo JSON em scripts/schemas/.
 *
 * @param {string} tableName - Nome da tabela
 * @returns {Object} Schema da tabela
 */
function loadSchema(tableName) {
  const schemaPath = new URL(`./schemas/${tableName}.json`, import.meta.url).pathname;

  if (!existsSync(schemaPath)) {
    throw new Error(
      `Schema não encontrado para a tabela "${tableName}".\n` +
      `Arquivo esperado: scripts/schemas/${tableName}.json\n` +
      `Tabelas disponíveis: musicas, posts, videos, dicas`
    );
  }

  return JSON.parse(readFileSync(schemaPath, 'utf-8'));
}

/**
 * Constrói a query CREATE TABLE a partir do schema.
 *
 * @param {Object} schema - Schema da tabela
 * @returns {string} SQL CREATE TABLE
 */
function buildCreateTableSQL(schema) {
  const columnDefs = schema.columns.map(col => {
    const parts = [col.name, col.type];
    if (col.constraints) {
      parts.push(col.constraints);
    }
    return parts.join(' ');
  });

  return `CREATE TABLE IF NOT EXISTS ${schema.table} (\n  ${columnDefs.join(',\n  ')}\n);`;
}

/**
 * Converte seedData do schema para array de valores SQL.
 *
 * @param {Object} schema - Schema da tabela
 * @returns {Array<Array<*>>} Array de arrays de valores
 */
function getSeedValues(schema) {
  if (!schema.seedData || schema.seedData.length === 0) {
    return [];
  }

  // Pega os nomes das colunas do primeiro item (excluindo serial id)
  const columns = Object.keys(schema.seedData[0]);

  return schema.seedData.map(item => {
    return columns.map(col => {
      const value = item[col];
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (value === null || value === undefined) return 'NULL';
      return value;
    });
  });
}

/**
 * Constrói a query INSERT com seedData.
 *
 * @param {Object} schema - Schema da tabela
 * @returns {string|null} SQL INSERT ou null se não houver seedData
 */
function buildSeedSQL(schema) {
  const values = getSeedValues(schema);
  if (values.length === 0) return null;

  const columns = Object.keys(schema.seedData[0]);
  const valueStrings = values.map(row => `(${row.join(', ')})`);

  return `INSERT INTO ${schema.table} (${columns.join(', ')}) VALUES\n  ${valueStrings.join(',\n  ')};`;
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