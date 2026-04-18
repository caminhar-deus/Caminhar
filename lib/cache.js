import { redis } from './redis.js';

// Map em memória estático para gerenciar o fallback do Rate Limit (quando Redis falhar)
const localRateLimitMap = new Map();

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
    // Em caso de erro na leitura do Redis, faz o fallback para a busca no banco de dados.
    return await fetchFunction();
  }

  if (cachedData) {
    // O Upstash/Redis client já faz o JSON.parse automaticamente se detectar JSON,
    // mas garantimos que retornamos o objeto correto.
    return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
  }

  // 2. Se não achou (Cache Miss), busca do banco de dados.
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
export async function clearAllCache() {
  if (!redis) return;
  await redis.flushdb();
}

/**
 * Verifica o Rate Limit de forma distribuída (Redis) com fallback para memória local.
 * 
 * @param {string} ip - IP do usuário ou identificador
 * @param {string} endpoint - Identificador único da rota (ex: 'api:products', 'api:auth')
 * @param {number} limit - Limite de requisições permitidas (padrão: 30)
 * @param {number} windowMs - Janela de tempo em milissegundos (padrão: 1 minuto)
 * @returns {Promise<boolean>} True se excedeu o limite, False caso contrário
 */
export async function checkRateLimit(ip, endpoint, limit = 30, windowMs = 60000) {
  // Whitelist permanente para IPs locais e testes
  const permanentWhitelist = ['127.0.0.1', '::1', 'localhost', 'unknown'];
  if (permanentWhitelist.includes(ip)) {
    return false; // Nunca limita estes IPs
  }

  let isRateLimited = false;
  const localKey = `${endpoint}:${ip}`;

  function checkInMemory() {
    const now = Date.now();
    // Limpa a estrutura se estiver sob ataque DDoS para evitar memory leak
    if (localRateLimitMap.size > 5000) localRateLimitMap.clear();
    
    const rateData = localRateLimitMap.get(localKey) || { count: 0, startTime: now };
    if (now - rateData.startTime > windowMs) {
      rateData.count = 1;
      rateData.startTime = now;
    } else {
      rateData.count++;
    }
    localRateLimitMap.set(localKey, rateData);
    return rateData.count > limit;
  }

  if (redis) {
    try {
      const redisKey = `ratelimit:${endpoint}:${ip}`;
      const currentCount = await redis.incr(redisKey);
      
      // Define a expiração apenas no primeiro hit (convertendo de ms para segundos)
      if (currentCount === 1) await redis.expire(redisKey, Math.floor(windowMs / 1000));
      if (currentCount > limit) isRateLimited = true;
    } catch (err) {
      console.warn(`⚠️ [Rate Limit] Falha no Redis para ${endpoint}, ativando fallback em memória:`, err.message);
      isRateLimited = checkInMemory();
    }
  } else {
    isRateLimited = checkInMemory();
  }

  return isRateLimited;
}