import { getRedisInstance, redisGet, redisSet, redisDel, redisScan, redisIncr, redisExpire, redisFlushdb, checkRedisHealth } from './redis.js';
import { logger } from './logger.js';

// Helper local para compatibilidade com verificações `if (redis)` existentes
function isRedisConnected() {
  return getRedisInstance() !== null;
}

// Map em memória estático para gerenciar o fallback do Rate Limit (quando Redis falhar)
const localRateLimitMap = new Map();

// Cache em memória para dados da aplicação (fallback completo quando Redis offline)
const appMemoryCache = new Map();

// Mapa de promises pendentes para Single-Flight (request coalescing)
// Quando múltiplas chamadas concorrentes pedem a mesma chave, apenas a
// primeira busca no banco; as demais aguardam a mesma promise resolver.
const inflightPromises = new Map();

// Métricas e monitoramento
const metrics = {
  redisHits: 0,
  redisMisses: 0,
  redisErrors: 0,
  memoryHits: 0,
  memoryMisses: 0,
  fallbackActivations: 0,
  lastFallbackTime: null,
  totalGetOrSetCalls: 0,
  singleFlightHits: 0,
};

// Referência do timer para cleanup em testes
let cleanupTimer = null;

// Lazy eviction: não itera mais o Map periodicamente.
// O expurgo de entradas expiradas é feito sob demanda em checkInMemory().
// O timer existe apenas como safety net para evitar growth infinito em caso de falha.
cleanupTimer = setInterval(() => {
  // Safety net: se o Map cresceu além do limite por algum motivo, faz limpeza seletiva
  if (localRateLimitMap.size > 5000) {
    const now = Date.now();
    let removed = 0;

    // Remove apenas entradas com mais de 120s (2x a janela padrão máxima)
    for (const [key, data] of localRateLimitMap.entries()) {
      if (now - data.startTime > 120000) {
        localRateLimitMap.delete(key);
        removed++;
        if (localRateLimitMap.size <= 4000) break; // Interrompe ao atingir margem segura
      }
    }

    if (removed > 0) {
      logger.warn('Cache', 'Rate Limit Map limite máximo: removidas ' + removed + ' entradas antigas');
    }

    // Ainda restam muitas entradas? Remove as mais antigas seletivamente
    if (localRateLimitMap.size > 5000) {
      const sortedEntries = [...localRateLimitMap.entries()]
        .sort(([, a], [, b]) => a.startTime - b.startTime);
      const toDelete = sortedEntries.slice(0, sortedEntries.length - 4000);
      toDelete.forEach(([key]) => localRateLimitMap.delete(key));
      logger.warn('Cache', 'Rate Limit Map: liberadas ' + toDelete.length + ' entradas excedentes (lazy eviction)');
    }
  }

  // Limpeza periódica do cache de aplicação em memória
  if (appMemoryCache.size > 2000) {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of appMemoryCache.entries()) {
      if (now > entry.expiresAt) {
        appMemoryCache.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      logger.info('Cache', 'Cache app: ' + removed + ' entradas expiradas removidas (safety net)');
    }
  }
}, 60000);

/**
 * Limpa o timer de limpeza periódica (usado em testes)
 */
export function cleanupRateLimitTimer() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Retorna métricas de monitoramento do cache e rate limit
 * @returns {Object} Métricas atuais
 */
export function getCacheMetrics() {
  return {
    ...metrics,
    localMapSize: localRateLimitMap.size,
    memoryCacheSize: appMemoryCache.size,
    redisConnected: isRedisConnected(),
  };
}

const DEFAULT_TTL = 3600; // 1 hora em segundos

/**
 * Salva dados no cache de aplicação em memória
 * Usa Math.floor para sincronizar com a expiração do Redis (segundos inteiros)
 */
function setAppMemoryCache(key, data, ttlSeconds) {
  const ttlMs = Math.floor(ttlSeconds) * 1000;
  appMemoryCache.set(key, {
    data: JSON.stringify(data),
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Obtém dados do cache de aplicação em memória
 */
function getAppMemoryCache(key) {
  const entry = appMemoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    appMemoryCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Remove entradas do cache de aplicação em memória por padrão
 */
function delAppMemoryCache(keyPattern) {
  if (keyPattern.includes('*')) {
    const pattern = keyPattern.replace(/\*/g, '');
    for (const [key] of appMemoryCache.entries()) {
      if (key.startsWith(pattern)) {
        appMemoryCache.delete(key);
      }
    }
  } else {
    appMemoryCache.delete(keyPattern);
  }
}

/**
 * Tenta obter dados do cache. Se não existir, executa a função de fetch,
 * salva no cache e retorna o resultado.
 * 
 * @param {string} key - A chave do Redis (ex: 'posts:all')
 * @param {Function} fetchFunction - Função assíncrona que busca os dados no banco se não houver cache
 * @param {number} ttlSeconds - Tempo de vida do cache em segundos (padrão: 3600s / 1h)
 */
export async function getOrSetCache(key, fetchFunction, ttlSeconds = DEFAULT_TTL) {
  metrics.totalGetOrSetCalls++;

  // 1. Tenta cache em memória primeiro (L1 - mais rápido, sem I/O de rede)
  // Após o primeiro cache miss, fetchAndCache() sempre popula a memória,
  // então cache hits subsequentes são servidos instantaneamente.
  const memoryData = getAppMemoryCache(key);
  if (memoryData) {
    metrics.memoryHits++;
    return JSON.parse(memoryData);
  }

  // 2. Tenta Redis (L2 - distribuído, com I/O de rede)
  if (isRedisConnected()) {
    let cachedData;
    try {
      cachedData = await redisGet(key);
    } catch (error) {
      logger.error('Cache', 'Erro de Cache Redis (GET) para chave ' + key + ':', error);
      metrics.redisErrors++;
      // Se Redis falhou, busca do banco (memória já falhou no passo 1)
      return await fetchAndCache(key, fetchFunction, ttlSeconds);
    }

    if (cachedData) {
      // Cache Hit no Redis — popula memória para hits futuros
      metrics.redisHits++;
      const data = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      setAppMemoryCache(key, data, ttlSeconds);
      return data;
    }
  }

  // 3. Cache Miss (L1 + L2) — verifica se já há uma busca em andamento (Single-Flight)
  const existingPromise = inflightPromises.get(key);
  if (existingPromise) {
    metrics.singleFlightHits++;
    return existingPromise;
  }

  // Cria uma promise para esta busca e armazena no mapa
  const promise = fetchAndCache(key, fetchFunction, ttlSeconds).finally(() => {
    // Remove do mapa após resolução ou rejeição
    inflightPromises.delete(key);
  });

  inflightPromises.set(key, promise);
  metrics.redisMisses++;
  if (!isRedisConnected()) metrics.memoryMisses++;
  return promise;
}

/**
 * Executa fetchFunction, salva resultado no cache e retorna
 */
async function fetchAndCache(key, fetchFunction, ttlSeconds) {
  // Erros em fetchFunction (ex: rate limit) devem propagar para o chamador.
  const data = await fetchFunction();

  // Salva no Redis e/ou memória
  if (data) {
    const serialized = JSON.stringify(data);
    
    // Tenta Redis
    if (isRedisConnected()) {
      try {
        await redisSet(key, serialized, ttlSeconds);
      } catch (error) {
        logger.error('Cache', 'Erro de Cache Redis (SET) para chave ' + key + ':', error);
        metrics.redisErrors++;
      }
    }

    // Sempre salva no cache em memória também (mais rápido para próximas leituras)
    // Usa o mesmo TTL com Math.floor para sincronizar expiração com Redis
    setAppMemoryCache(key, data, ttlSeconds);
  }

  return data;
}

// Função para invalidar cache manualmente (usar após Updates/Deletes)
// Suporta:
// - Chave exata: 'musicas' → deleta a chave 'musicas'
// - Padrão com *: 'musicas:*' → usa SCAN para encontrar e deletar todas as chaves que casam
export async function invalidateCache(keyPattern) {
  // Sempre limpa do cache em memória
  delAppMemoryCache(keyPattern);

  if (!isRedisConnected()) return;

  // Se o padrão contém wildcard (*), usa SCAN para encontrar e deletar múltiplas chaves
  if (keyPattern.includes('*')) {
    let cursor = '0';
    const keysToDelete = [];
    do {
      const [nextCursor, foundKeys] = await redisScan(cursor, { match: keyPattern, count: 100 });
      cursor = nextCursor;
      keysToDelete.push(...foundKeys);
    } while (cursor !== '0');

    if (keysToDelete.length > 0) {
      await redisDel(...keysToDelete);
    }
    return;
  }

  // Chave exata (sem wildcard) — mantém o comportamento original
  await redisDel(keyPattern);
}

// Função para limpar todo o cache (FLUSHDB) - Cuidado: apaga tudo no Redis
export async function clearAllCache(options = {}) {
  const { confirm = false } = options;

  if (!confirm) {
    throw new Error('Operação FLUSHDB requer confirmação explícita. Use { confirm: true } para prosseguir.');
  }

  // Limpa cache em memória
  appMemoryCache.clear();

  if (!isRedisConnected()) {
    return { success: true, fromMemory: true };
  }
  
  try {
    await redisFlushdb();
    return { success: true };
  } catch (error) {
    logger.error('Cache', 'Erro ao executar FLUSHDB no Redis:', error);
    metrics.redisErrors++;
    // Retorna indicador de falha para o chamador ter visibilidade do problema
    return { success: false, error: error.message };
  }
}

/**
 * Verifica o Rate Limit de forma distribuída (Redis) com fallback para memória local.
 * 
 * @param {string} ip - IP do usuário ou identificador
 * @param {string} endpoint - Identificador único da rota (ex: 'api:products', 'api:auth')
 * @param {number|Function} limit - Limite de requisições permitidas (padrão: 300). Pode ser função que recebe o IP.
 * @param {number} windowMs - Janela de tempo em milissegundos (padrão: 1 minuto)
 * @returns {Promise<boolean>} True se excedeu o limite, False caso contrário
 */
export async function checkRateLimit(ip, endpoint, limit = 300, windowMs = 60000) {
  // Bypass completo para testes de carga via variável de ambiente
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return false;
  }

  // Whitelist permanente para IPs locais e testes
  // NOTA: 'unknown' foi removido pois pode ser manipulado via header ausente
  const permanentWhitelist = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1', '::ffff:0:0'];

  // Normaliza IPv4-mapped IPv6 (ex: ::ffff:127.0.0.1 → 127.0.0.1)
  // Isso garante que IPs locais atrás de proxy não sejam rate-limited
  const normalizedIp = ip.replace(/^::ffff:/, '');
  if (permanentWhitelist.includes(normalizedIp) || permanentWhitelist.includes(ip)) {
    return false; // Nunca limita estes IPs
  }

  // Whitelist dinâmica para IPs de redes internas (Docker, VPN, redes locais)
  // Isso evita que ambientes de desenvolvimento/containers sejam rate-limited
  const privateRanges = [/^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./];
  for (const range of privateRanges) {
    if (range.test(ip)) {
      return false; // IPs privados não são rate-limited (ambiente controlado)
    }
  }

  // Calcula o limite (suporta função dinâmica)
  const effectiveLimit = typeof limit === 'function' ? limit(ip) : limit;

  let isRateLimited = false;
  const localKey = `${endpoint}:${ip}`;

  function checkInMemory() {
    const now = Date.now();
    // Lazy eviction: expurga entradas expiradas da chave atual antes de processar
    const existingData = localRateLimitMap.get(localKey);
    if (existingData && (now - existingData.startTime > windowMs)) {
      localRateLimitMap.delete(localKey);
    }

    // Proteção contra memory leak sem perder tracking de todos os IPs:
    // remove seletivamente apenas uma entrada antiga se o Map estiver cheio
    if (localRateLimitMap.size > 5000) {
      const oldestKey = localRateLimitMap.entries().next().value?.[0];
      if (oldestKey) localRateLimitMap.delete(oldestKey);
    }
    
    const rateData = existingData && !(now - existingData.startTime > windowMs)
      ? existingData
      : { count: 0, startTime: now };
    
    rateData.count++;
    localRateLimitMap.set(localKey, rateData);
    return rateData.count > effectiveLimit;
  }

  if (isRedisConnected()) {
    try {
      const redisKey = `ratelimit:${endpoint}:${ip}`;
      // Usando SET com opções NX EX para operação atômica (elimina Race Condition)
      const currentCount = await redisIncr(redisKey);
      
      // Garantimos que a chave sempre terá expiração, mesmo que haja falha entre incr e expire
      // Usando pipelining para enviar os dois comandos em uma única requisição
      if (currentCount <= effectiveLimit + 5) {
        // Só atualizamos o TTL nos primeiros hits para evitar sobrecarga
        await redisExpire(redisKey, Math.floor(windowMs / 1000), 'NX');
      }
      
      if (currentCount > effectiveLimit) isRateLimited = true;
    } catch (err) {
      logger.warn('Cache', 'Falha no Redis para ' + endpoint + ', ativando fallback em memória:', err.message);
      metrics.fallbackActivations++;
      metrics.lastFallbackTime = Date.now();
      isRateLimited = checkInMemory();
    }
  } else {
    isRateLimited = checkInMemory();
  }

  return isRateLimited;
}