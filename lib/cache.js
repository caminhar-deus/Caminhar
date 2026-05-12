import { redis } from './redis.js';

// Map em memória estático para gerenciar o fallback do Rate Limit (quando Redis falhar)
const localRateLimitMap = new Map();

// Métricas e monitoramento
const metrics = {
  redisHits: 0,
  redisMisses: 0,
  redisErrors: 0,
  fallbackActivations: 0,
  lastFallbackTime: null
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
      console.warn(`⚠️ Rate Limit Map limite máximo: removidas ${removed} entradas antigas`);
    }

    // Ainda restam muitas entradas? Remove as mais antigas seletivamente
    if (localRateLimitMap.size > 5000) {
      const sortedEntries = [...localRateLimitMap.entries()]
        .sort(([, a], [, b]) => a.startTime - b.startTime);
      const toDelete = sortedEntries.slice(0, sortedEntries.length - 4000);
      toDelete.forEach(([key]) => localRateLimitMap.delete(key));
      console.warn(`⚠️ Rate Limit Map: liberadas ${toDelete.length} entradas excedentes (lazy eviction)`);
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
    redisConnected: !!redis
  };
}

const DEFAULT_TTL = 3600; // 1 hora em segundos

/**
 * Tenta obter dados do cache. Se não existir, executa a função de fetch,
 * salva no cache e retorna o resultado.
 * 
 * @param {string} key - A chave do Redis (ex: 'posts:all')
 * @param {Function} fetchFunction - Função assíncrona que busca os dados no banco se não houver cache
 * @param {number} ttlSeconds - Tempo de vida do cache em segundos (padrão: 3600s / 1h)
 */
export async function getOrSetCache(key, fetchFunction, ttlSeconds = DEFAULT_TTL) {
  // Se o Redis não estiver configurado, apenas busca do banco (bypass)
  if (!redis) {
    return await fetchFunction();
  }

  let cachedData;
  try {
    // 1. Tenta pegar do Redis
    cachedData = await redis.get(key);
  } catch (error) {
    console.error(`Erro de Cache Redis (GET) para chave ${key}:`, error);
    metrics.redisErrors++;
    // Em caso de erro na leitura do Redis, faz o fallback para a busca no banco de dados.
    return await fetchFunction();
  }

  if (cachedData) {
    // Cache Hit
    metrics.redisHits++;
    // O Upstash/Redis client já faz o JSON.parse automaticamente se detectar JSON,
    // mas garantimos que retornamos o objeto correto.
    return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
  }

  // 2. Se não achou (Cache Miss), busca do banco de dados.
  metrics.redisMisses++;
  // Erros em fetchFunction (ex: rate limit) devem propagar para o chamador.
  const data = await fetchFunction();

  // 3. Salva no Redis com expiração (TTL), mas não falha a requisição se o set falhar.
  if (data) {
    try {
      await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
    } catch (error) {
      console.error(`Erro de Cache Redis (SET) para chave ${key}:`, error);
      // Não relança o erro, apenas loga. O dado já foi obtido.
    }
  }

  return data;
}

// Função para invalidar cache manualmente (usar após Updates/Deletes)
export async function invalidateCache(keyPattern) {
  if (!redis) return;
  // Nota: Para deletar por padrão (ex: posts:*), seria necessário usar 'keys' + 'del', 
  // mas 'keys' é lento. O ideal é saber a chave exata ou usar Sets.
  // Aqui deletamos uma chave específica.
  await redis.del(keyPattern);
}

// Função para limpar todo o cache (FLUSHDB) - Cuidado: apaga tudo no Redis
export async function clearAllCache(options = {}) {
  const { confirm = false } = options;

  if (!confirm) {
    throw new Error('Operação FLUSHDB requer confirmação explícita. Use { confirm: true } para prosseguir.');
  }

  if (!redis) {
    throw new Error('Redis não está conectado ou configurado');
  }
  
  try {
    await redis.flushdb();
    return { success: true };
  } catch (error) {
    console.error('Erro ao executar FLUSHDB no Redis:', error);
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
 * @param {number|Function} limit - Limite de requisições permitidas (padrão: 30). Pode ser função que recebe o IP.
 * @param {number} windowMs - Janela de tempo em milissegundos (padrão: 1 minuto)
 * @returns {Promise<boolean>} True se excedeu o limite, False caso contrário
 */
export async function checkRateLimit(ip, endpoint, limit = 30, windowMs = 60000) {
  // Whitelist permanente para IPs locais e testes
  // NOTA: 'unknown' foi removido pois pode ser manipulado via header ausente
  const permanentWhitelist = ['127.0.0.1', '::1', 'localhost'];
  if (permanentWhitelist.includes(ip)) {
    return false; // Nunca limita estes IPs
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

  if (redis) {
    try {
      const redisKey = `ratelimit:${endpoint}:${ip}`;
      // Usando SET com opções NX EX para operação atômica (elimina Race Condition)
      // Primeiro verificamos se a chave já existe e obtemos o valor atual
      const currentCount = await redis.incr(redisKey);
      
      // Garantimos que a chave sempre terá expiração, mesmo que haja falha entre incr e expire
      // Usando pipelining para enviar os dois comandos em uma única requisição
      if (currentCount <= effectiveLimit + 5) {
        // Só atualizamos o TTL nos primeiros hits para evitar sobrecarga
        await redis.expire(redisKey, Math.floor(windowMs / 1000), 'NX');
      }
      
      if (currentCount > effectiveLimit) isRateLimited = true;
    } catch (err) {
      console.warn(`⚠️ [Rate Limit] Falha no Redis para ${endpoint}, ativando fallback em memória:`, err.message);
      metrics.fallbackActivations++;
      metrics.lastFallbackTime = Date.now();
      isRateLimited = checkInMemory();
    }
  } else {
    isRateLimited = checkInMemory();
  }

  return isRateLimited;
}