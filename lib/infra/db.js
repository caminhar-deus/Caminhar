import { Pool } from 'pg';
import { logger } from './logger.js';

// Use a connection pool for better performance and connection management.
// Lazy initialization: the pool is created on first use, not at module load time.
// This ensures that jest.mock('pg') is already active before new Pool() is called.
let pool = null;
let healthCheckTimer = null;

/**
 * Inicia um health check periódico para verificar se o banco está acessível.
 * Caso o health check falhe, o pool é automaticamente resetado para forçar
 * uma reconexão na próxima consulta.
 * @param {import('pg').Pool} poolInstance - A instância do pool a ser monitorada.
 * @returns {NodeJS.Timeout} O identificador do intervalo.
 */
function startHealthCheck(poolInstance) {
  // Não inicia health check em ambiente de teste para evitar
  // que o setInterval mantenha o event loop aberto após os testes
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'test') {
    return null;
  }

  let active = true;
  const interval = setInterval(async () => {
    // Se o health check foi desativado (ex: resetPool), não executa
    if (!active) return;

    try {
      const client = await poolInstance.connect();
      await client.query('SELECT 1');
      client.release();
    } catch (err) {
      // Se não está mais ativo, ignora (evita logs espúrios em testes)
      if (!active) return;

      // Se o pool já foi fechado (closeDatabase), não tenta recriar
      if (err.message?.includes('Cannot use a pool after calling end on the pool') ||
          err.message?.includes('Connection pool') ||
          err.message?.includes('Client has already been released')) {
        if (!active) return;
        active = false;
        clearInterval(interval);
        if (pool === poolInstance) {
          pool = null;
        }
        return;
      }

      logger.warn('DB', 'Health check falhou, recriando pool...', err.message);
      clearInterval(interval);
      active = false;
      if (pool === poolInstance) {
        pool = null;
        logger.info('DB', 'Pool resetado após falha no health check');
      }
    }
  }, 60000); // A cada 60 segundos

  // Retorna um objeto com o intervalo e a flag active, para que resetPool
  // possa desativar a flag antes de limpar o intervalo, prevenindo execuções
  // residuais do callback do setInterval
  return { interval, active: () => active, deactivate: () => { active = false; } };
}

function createPool() {
  // Se já existe um health check ativo do pool anterior, limpa
  if (healthCheckTimer) {
    if (typeof healthCheckTimer === 'object' && healthCheckTimer.deactivate) {
      healthCheckTimer.deactivate();
      clearInterval(healthCheckTimer.interval);
    } else {
      clearInterval(healthCheckTimer);
    }
    healthCheckTimer = null;
  }

  const newPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false // Permite conexão com certificados auto-assinados (comum em cloud)
    } : undefined,
    // Configurações de performance otimizadas para até 50 VUs simultâneos
    max: 50,              // Máximo de conexões no pool (aumentado de 20 para 50)
    min: 5,               // Mínimo de conexões no pool (aumentado de 2 para 5)
    idleTimeoutMillis: 60000, // Tempo de timeout de conexões ociosas (aumentado de 30s para 60s)
    connectionTimeoutMillis: 15000, // Tempo de timeout de conexão (aumentado de 5s para 15s para bancos cloud)
  });

  // Handler para erros fatais no pool (ex: banco caiu, conexão perdida)
  newPool.on('error', async (err) => {
    logger.error('DB', 'Erro fatal no pool de conexões PostgreSQL:', err.message);
    // Tenta recriar o pool automaticamente em caso de erro fatal
    try {
      await newPool.end();
    } catch {
      // Ignora erro ao tentar fechar pool já defeituoso
    }
    // Se o pool atual ainda for o mesmo que falhou, reseta a referência
    if (pool === newPool) {
      pool = null;
      logger.info('DB', 'Pool de conexões recriado após erro fatal');
    }
  });

  // Inicia health check periódico para detectar falhas precoces
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }
  healthCheckTimer = startHealthCheck(newPool);

  // Pré-aquece o pool com uma conexão inicial para evitar timeout na primeira query
  // Não executa em ambiente de teste para evitar que o setTimeout mantenha
  // o event loop aberto após a execução dos testes
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'test') {
    setTimeout(async () => {
      try {
        const client = await newPool.connect();
        await client.query('SELECT 1');
        client.release();
        logger.info('DB', 'Pool pré-aquecido com sucesso');
      } catch (err) {
        logger.warn('DB', 'Pré-aquecimento do pool falhou, será criado sob demanda:', err.message);
      }
    }, 100);
  }

  return newPool;
}

/**
 * Obtém o pool de conexões, criando-o se necessário (lazy initialization).
 * @returns {import('pg').Pool} A instância do pool.
 */
export function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

// Exported for tests: resets the cached pool so that the next call to
// getPool() creates a fresh instance (picking up any jest.mock changes).
export function resetPool() {
  if (healthCheckTimer) {
    if (typeof healthCheckTimer === 'object' && healthCheckTimer.deactivate) {
      healthCheckTimer.deactivate();
      clearInterval(healthCheckTimer.interval);
    } else {
      clearInterval(healthCheckTimer);
    }
    healthCheckTimer = null;
  }
  if (pool) {
    // Usa encadeamento opcional pois em testes o pool pode ser um mock
    // sem o método removeAllListeners ou end pode retornar undefined
    pool.removeAllListeners?.('error');
    const endPromise = pool.end();
    if (endPromise && typeof endPromise.catch === 'function') {
      endPromise.catch(() => {});
    }
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
  
  // Define tentativas: 2 para consultas via pool (timeout recovery),
  // 1 para transações (com client), pois transações têm gerenciamento próprio
  const maxAttempts = client ? 1 : 2;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    
    try {
      if (log && process.env.NODE_ENV !== 'production' && process.env.LOG_LEVEL === 'debug') {
        logger.debug('DB', 'Executando consulta SQL', {
          query: text.replace(/\s+/g, ' ').trim(),
          params: params.length > 0 ? params : undefined,
          timestamp: new Date().toISOString()
        });
      }

      const db = client || getPool();
      const res = await db.query(text, params);
      const duration = Date.now() - start;

      if (log && process.env.NODE_ENV !== 'production' && process.env.LOG_LEVEL === 'debug') {
        logger.debug('DB', 'Consulta SQL executada com sucesso', {
          duration: `${duration}ms`,
          rowCount: res?.rowCount || 0,
          timestamp: new Date().toISOString()
        });
      }

      return res;
    } catch (error) {
      const duration = Date.now() - start;
      
      // Se é um erro de timeout/rede e ainda temos tentativas, faz retry
      // sem resetar o pool (o pool original ainda é válido, a conexão apenas demorou)
      if (attempt < maxAttempts && (
        error.message?.includes('timeout') ||
        error.message?.includes('Connection terminated') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('socket not connected') ||
        error.message?.includes('ETIMEDOUT')
      )) {
        logger.warn(
          'DB',
          `Tentativa ${attempt} de ${maxAttempts} falhou por timeout. Tentando novamente...`
        );
        // Pequena pausa antes de retentar para dar tempo ao banco se recuperar
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }
      
      const errorDetails = {
        code: error.code,
        message: error.message,
        query: text.replace(/\s+/g, ' ').trim(),
        duration: `${duration}ms`,
        attempt,
      };

      logger.error('DB', 'Erro ao executar consulta SQL', errorDetails);

      if (throwOnError) {
        throw error;
      }

      return null;
    }
  }
}

/**
 * Closes the database connection pool.
 */
export async function closeDatabase() {
  try {
    // Desativa o health check timer antes de fechar o pool,
    // evitando warnings de "Cannot use a pool after calling end on the pool".
    // Como o callback do setInterval é async, a execução pode já ter passado
    // do guard "if (!active) return" antes do deactivate. Por isso também
    // removemos os listeners do pool, para que o erro no .connect() não dispare
    // o handler de erro fatal que tentaria recriar o pool.
    if (healthCheckTimer) {
      if (typeof healthCheckTimer === 'object' && healthCheckTimer.deactivate) {
        healthCheckTimer.deactivate();
        clearInterval(healthCheckTimer.interval);
      } else {
        clearInterval(healthCheckTimer);
      }
      healthCheckTimer = null;
    }
    if (pool) {
      pool.removeAllListeners?.('error');
      await pool.end();
      pool = null;
      logger.info('DB', 'Connection pool fechado com sucesso');
    }
  } catch (error) {
    logger.error('DB', 'Erro ao fechar connection pool', {
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
    logger.error('DB', 'Transação falhou e foi revertida', {
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
    logger.error('DB', 'Health check do banco de dados falhou', {
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
    logger.error('DB', 'Erro ao obter informações do banco de dados', {
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
