// Módulo compartilhado de limpeza de dados de teste no PostgreSQL
// Uso: import { loadEnv, cleanTableByPattern } from './utils/cleanup.js';

export { loadEnv } from './load-env.js';
import { getPool, closePool } from '../db/connection.js';

/**
 * Remove registros de uma tabela com base em padrões LIKE em uma coluna.
 *
 * @param {object} options
 * @param {string} options.table - Nome da tabela no banco
 * @param {string} options.column - Nome da coluna para aplicar os LIKE patterns
 * @param {string[]} options.patterns - Array de padrões LIKE (ex: ['post-carga-%', 'K6%'])
 * @param {boolean} [options.showDeleted=false] - Se true, exibe os registros removidos via RETURNING
 */
export async function cleanTableByPattern({ table, column, patterns, showDeleted = false }) {
  const pool = getPool();

  try {
    console.log(`🧹 Iniciando limpeza da tabela "${table}"...`);

    // Constrói a query OR dinamicamente a partir dos patterns
    const whereClause = patterns.map((_, i) => `${column} LIKE $${i + 1}`).join(' OR ');
    const returningClause = showDeleted ? ' RETURNING id, ' + column : '';
    const deleteQuery = `DELETE FROM ${table} WHERE ${whereClause}${returningClause}`;

    const { rowCount, rows } = await pool.query(deleteQuery, patterns);

    if (rowCount > 0) {
      console.log(`✅ ${rowCount} registro(s) removido(s) da tabela "${table}".`);
      if (showDeleted && rows.length > 0) {
        rows.forEach(row => console.log(`   - [${row.id}] ${row[column]}`));
      }
    } else {
      console.log(`✨ Nenhum registro encontrado na tabela "${table}" para os padrões fornecidos.`);
    }
  } catch (error) {
    console.error(`❌ Erro ao limpar dados da tabela "${table}":`, error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}
