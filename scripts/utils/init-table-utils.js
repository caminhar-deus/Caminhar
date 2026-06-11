import { readFileSync, existsSync } from 'fs';

/**
 * Obtém o nome da tabela a partir dos argumentos da linha de comando.
 * Suporta: node init-table.js musicas | node init-table.js --table=musicas
 *
 * @returns {string} Nome da tabela
 */
export function getTableName() {
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
 * Carrega o schema da tabela a partir de um diretório de schemas.
 *
 * @param {string} tableName - Nome da tabela
 * @param {string} schemasDir - Caminho absoluto do diretório de schemas
 * @returns {Object} Schema da tabela
 */
export function loadSchemaFromDir(tableName, schemasDir) {
  const schemaPath = `${schemasDir}/${tableName}.json`;

  if (!existsSync(schemaPath)) {
    throw new Error(
      `Schema não encontrado para a tabela "${tableName}".\n` +
      `Arquivo esperado: ${schemasDir}/${tableName}.json\n` +
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
export function buildCreateTableSQL(schema) {
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
export function getSeedValues(schema) {
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
export function buildSeedSQL(schema) {
  const values = getSeedValues(schema);
  if (values.length === 0) return null;

  const columns = Object.keys(schema.seedData[0]);
  const valueStrings = values.map(row => `(${row.join(', ')})`);

  return `INSERT INTO ${schema.table} (${columns.join(', ')}) VALUES\n  ${valueStrings.join(',\n  ')};`;
}