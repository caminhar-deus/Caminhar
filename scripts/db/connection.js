import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Retorna uma instância única de Pool de conexão PostgreSQL.
 * Cria o pool na primeira chamada, reutiliza nas subsequentes.
 *
 * @returns {import('pg').Pool}
 */
export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não definida. Verifique o arquivo .env ou .env.local.');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

/**
 * Fecha o pool de conexão, se existir.
 * Deve ser chamado ao final da execução para evitar vazamento de conexões.
 *
 * @returns {Promise<void>}
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Reseta o pool de conexão para null.
 * Útil para testes que precisam recriar o pool do zero.
 */
export function resetPool() {
  pool = null;
}

/**
 * Executa uma query no banco de dados.
 * Wrapper simples sobre pool.query() com gerenciamento automático do pool.
 *
 * @param {string} text - SQL da query
 * @param {Array} [params] - Parâmetros para prepared statement
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params) {
  const p = getPool();
  if (params !== undefined) {
    return p.query(text, params);
  }
  return p.query(text);
}
