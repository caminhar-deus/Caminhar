import { Pool } from 'pg';

// Use a connection pool for better performance and connection management.
// Lazy initialization: the pool is created on first use, not at module load time.
// This ensures that jest.mock('pg') is already active before new Pool() is called.
let pool = null;
let healthCheckTimer = null;

function createPool() {
  const newPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false // Permite conexão com certificados auto-assinados (comum em cloud)
    } : undefined,
    // Configurações de performance
    max: 20,              // Máximo de conexões no pool
    min: 2,               // Mínimo de conexões no pool
    idleTimeoutMillis: 30000, // Tempo de timeout de conexões ociosas
    connectionTimeoutMillis: 2000, // Tempo de timeout de conexão
  });

  // Handler para erros fatais no pool (ex: banco caiu, conexão perdida)
  newPool.on('error', async (err) => {
    console.error('Erro fatal no pool de conexões PostgreSQL:', err.message);
    // Tenta recriar o pool automaticamente em caso de erro fatal
    try {
      await newPool.end();
    } catch (_) {
      // Ignora erro ao tentar fechar pool já defeituoso
    }
    // Se o pool atual ainda for o mesmo que falhou, reseta a referência
    if (pool === newPool) {
      pool = null;
      console.log('Pool de conexões recriado após erro fatal');
    }
  });

  return newPool;
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

// Exported for tests: resets the cached pool so that the next call to
// getPool() creates a fresh instance (picking up any jest.mock changes).
export function resetPool() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  if (pool) {
    pool.removeAllListeners('error');
    pool.end().catch(() => {});
  }
  pool = null;
}

/**
 * @param {string} text The SQL query text.
 * @param {Array} params The parameters for the query.
 * @param {Object} options Options like logging and error handling.
 * @returns {Promise<QueryResult>} The result from the database.
 */
export async function query(text, params = [], options = {}) {
  // Allow passing a specific client for transactions
  const { log = false, throwOnError = true, client } = options;
  const start = Date.now();
  
  try {
    if (log) {
      console.log('Executando consulta SQL', {
        query: text.replace(/\s+/g, ' ').trim(),
        params: params.length > 0 ? params : undefined,
        timestamp: new Date().toISOString()
      });
    }

    const db = client || getPool();
    const res = await db.query(text, params);
    const duration = Date.now() - start;

    if (log) {
      console.log('Consulta SQL executada com sucesso', {
        duration: `${duration}ms`,
        rowCount: res?.rowCount || 0,
        timestamp: new Date().toISOString()
      });
    }

    return res;
  } catch (error) {
    const duration = Date.now() - start;
    
    const errorDetails = {
      code: error.code,
      message: error.message,
      query: text.replace(/\s+/g, ' ').trim(),
      duration: `${duration}ms`
    };

    console.error('Erro ao executar consulta SQL', errorDetails);

    if (throwOnError) {
      throw error;
    }

    return null;
  }
}

/**
 * Closes the database connection pool.
 */
export async function closeDatabase() {
  try {
    await getPool().end();
    pool = null; // Reset so a new pool can be created if needed
    console.log('Connection pool fechado com sucesso');
  } catch (error) {
    console.error('Erro ao fechar connection pool', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Executa uma transação com rollback automático em caso de erro.
 * 
 * @param {Function} callback - Função que recebe o client da transação
 * @returns {Promise<*>} Resultado da transação
 */
export async function transaction(callback) {
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transação falhou e foi revertida', {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verifica a saúde da conexão com o banco de dados.
 * 
 * @returns {Promise<boolean>} True se a conexão está saudável
 */
export async function healthCheck() {
  try {
    const result = await query('SELECT 1 as health_check', [], { log: false });
    return result && result.rows.length > 0 && result.rows[0].health_check === 1;
  } catch (error) {
    console.error('Health check do banco de dados falhou', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

/**
 * Obtém informações sobre o banco de dados.
 * 
 * @returns {Promise<Object>} Informações do banco de dados
 */
export async function getDatabaseInfo() {
  try {
    const [version, connections, size] = await Promise.all([
      query('SELECT version() as version', [], { log: false }),
      query('SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = \'active\'', [], { log: false }),
      query('SELECT pg_database_size(current_database()) as size_bytes', [], { log: false })
    ]);

    return {
      version: version.rows[0].version,
      activeConnections: parseInt(connections.rows[0].active_connections, 10),
      sizeBytes: parseInt(size.rows[0].size_bytes, 10),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao obter informações do banco de dados', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// NOTA: Re-exports removidos. Importe diretamente dos módulos de origem:
// - getSetting, updateSetting, setSetting, getAllSettings → './domain/settings.js'
// - createRecord, updateRecords, deleteRecords           → './crud.js'
// - logActivity                                          → './domain/audit.js'
// - createPost, updatePost, deletePost, getPaginatedPosts, getRecentPosts, getAllPosts → './domain/posts.js'
