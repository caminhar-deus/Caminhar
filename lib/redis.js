import { Redis } from '@upstash/redis';
import { logger } from './logger.js';

/**
 * Módulo Redis com suporte a:
 * - Inicialização segura com validação completa
 * - Fallback em memória quando Redis está indisponível
 * - Health check para monitoramento de disponibilidade
 * - Métricas de conexão
 */

const memoryCache = new Map();
const DEFAULT_MEMORY_TTL = 3600; // 1 hora em segundos

let redisInstance = null;
let initializationAttempted = false;

/**
 * Inicializa o cliente Redis de forma segura (lazy, executado uma única vez).
 * @returns {Object|null} Instância do Redis ou null se não disponível
 */
function initializeRedis() {
  if (initializationAttempted) return redisInstance;
  initializationAttempted = true;

  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const redisUrl = process.env.REDIS_URL;

    // Prioridade 1: Upstash Redis REST API (produção)
    if (upstashUrl && upstashToken) {
      if (!upstashUrl.startsWith('https://')) {
        logger.warn('Redis', 'UPSTASH_REDIS_REST_URL é inválido! Deve começar com https://');
        logger.warn('Redis', 'Redis desabilitado, usando cache em memória como fallback');
      } else if (upstashToken.startsWith('https://')) {
        logger.warn('Redis', 'As variáveis estão TROCADAS! UPSTASH_REDIS_REST_TOKEN recebeu a URL');
        logger.warn('Redis', 'Redis desabilitado, usando cache em memória como fallback');
      } else {
        redisInstance = new Redis({
          url: upstashUrl,
          token: upstashToken,
        });
        logger.success('Redis', 'Redis Upstash REST inicializado com sucesso');
      }
    }
    // Prioridade 2: REDIS_URL (CI/GitHub Actions, protocolo redis://)
    else if (redisUrl) {
      logger.info('Redis', `REDIS_URL detectada (${redisUrl.startsWith('redis://') ? 'redis://...' : redisUrl})`);
      logger.info('Redis', '@upstash/redis não suporta protocolo redis://.');
      logger.info('Redis', 'Usando cache em memória com Redis semanticamente equivalente.');
      logger.info('Redis', 'Para Redis TCP nativo, instale ioredis: npm install ioredis');
      // redisInstance permanece null → fallback em memória
    }
    else {
      logger.info('Redis', 'Nenhuma variável Redis definida, usando cache em memória');
    }
  } catch (error) {
    logger.error('Redis', 'Erro ao inicializar cliente Redis:', error.message);
    logger.warn('Redis', 'Redis desabilitado, usando cache em memória');
    redisInstance = null;
  }

  return redisInstance;
}

/**
 * Health check do Redis - verifica se o Redis está respondendo
 * @returns {Promise<boolean>}
 */
export async function checkRedisHealth() {
  initializeRedis();
  if (!redisInstance) return false;
  try {
    await redisInstance.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtém valor do cache em memória (fallback)
 */
function getFromMemory(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Salva valor no cache em memória (fallback)
 */
function setInMemory(key, data, ttlSeconds = DEFAULT_MEMORY_TTL) {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + (ttlSeconds * 1000),
  });
  // Lazy cleanup: se o map crescer demais, remove entradas expiradas
  if (memoryCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (now > v.expiresAt) {
        memoryCache.delete(k);
      }
      if (memoryCache.size <= 500) break;
    }
  }
}

/**
 * Tenta obter dado do Redis, com fallback para memória
 * @param {string} key 
 * @returns {Promise<string|null>}
 */
export async function redisGet(key) {
  if (redisInstance) {
    // Primeira tentativa
    try {
      const result = await redisInstance.get(key);
      if (result !== null && result !== undefined) return result;
    } catch (error) {
      logger.warn('Redis', `Erro GET para "${key}" (tentativa 1):`, error.message);
    }

    // Segunda tentativa (retry) antes de cair no fallback de memória
    // Evita falsos cache misses causados por falhas transitórias de rede
    try {
      const result = await redisInstance.get(key);
      if (result !== null && result !== undefined) return result;
    } catch (error) {
      logger.warn('Redis', `Erro GET para "${key}" (tentativa 2), usando fallback em memória:`, error.message);
    }
  }
  // Fallback: tenta memória
  return getFromMemory(key);
}

/**
 * Tenta salvar dado no Redis, com fallback para memória
 * @param {string} key 
 * @param {string} value 
 * @param {number} ttlSeconds 
 */
export async function redisSet(key, value, ttlSeconds = DEFAULT_MEMORY_TTL) {
  if (redisInstance) {
    try {
      await redisInstance.set(key, value, { ex: ttlSeconds });
      return;
    } catch (error) {
      logger.warn('Redis', `Erro SET para "${key}", usando fallback em memória:`, error.message);
    }
  }
  // Fallback: salva em memória
  setInMemory(key, value, ttlSeconds);
}

/**
 * Deleta chave(s) do Redis, com fallback para memória
 * @param {...string} keys 
 */
export async function redisDel(...keys) {
  if (redisInstance) {
    try {
      await redisInstance.del(...keys);
    } catch (error) {
      logger.warn('Redis', `Erro DEL para "${keys}", limpando da memória:`, error.message);
    }
  }
  // Sempre limpa da memória também
  for (const key of keys) {
    memoryCache.delete(key);
    // Se for padrão com wildcard, limpa entradas que casam
    if (key.includes('*')) {
      const pattern = key.replace(/\*/g, '');
      for (const [memKey] of memoryCache.entries()) {
        if (memKey.startsWith(pattern)) {
          memoryCache.delete(memKey);
        }
      }
    }
  }
}

/**
 * Escaneia chaves no Redis
 * @param {string} cursor 
 * @param {Object} options 
 * @returns {Promise<[string, string[]]>}
 */
export async function redisScan(cursor, options = {}) {
  if (redisInstance) {
    try {
      return await redisInstance.scan(cursor, options);
    } catch (error) {
      logger.warn('Redis', 'Erro SCAN, retornando vazio:', error.message);
    }
  }
  return ['0', []];
}

/**
 * Incrementa chave no Redis (usado para rate limit)
 * @param {string} key 
 * @returns {Promise<number>}
 */
export async function redisIncr(key) {
  if (redisInstance) {
    try {
      return await redisInstance.incr(key);
    } catch (error) {
      logger.warn('Redis', `Erro INCR para "${key}":`, error.message);
    }
  }
  // Fallback: incremento em memória
  const current = getFromMemory(key);
  const value = (current ? parseInt(current, 10) : 0) + 1;
  setInMemory(key, String(value), 60);
  return value;
}

/**
 * Define expiração em chave no Redis
 * @param {string} key 
 * @param {number} seconds 
 * @param {string} [nx] - 'NX' para setar apenas se não existir
 */
export async function redisExpire(key, seconds, nx) {
  if (redisInstance) {
    try {
      await redisInstance.expire(key, seconds, nx);
    } catch (error) {
      logger.warn('Redis', `Erro EXPIRE para "${key}":`, error.message);
    }
  }
}

/**
 * Executa FLUSHDB no Redis
 * @returns {Promise<Object>}
 */
export async function redisFlushdb() {
  if (redisInstance) {
    try {
      await redisInstance.flushdb();
    } catch (error) {
      throw new Error(`FLUSHDB falhou: ${error.message}`);
    }
  }
  memoryCache.clear();
  return { success: true };
}


// Exporta a instância real para uso em contextos que precisam do objeto diretamente
export function getRedisInstance() {
  initializeRedis();
  return redisInstance;
}

// Export nomeado para compatibilidade com testes e consumo direto
// A instância real deve ser obtida via getRedisInstance() para evitar
// efeitos colaterais na importação (Next.js avalia módulos separadamente
// em SSR e API Routes, causando inicialização duplicada).
export const redis = null;
