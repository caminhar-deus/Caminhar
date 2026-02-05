import { redis } from './redis';

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

  try {
    // 1. Tenta pegar do Redis
    const cachedData = await redis.get(key);

    if (cachedData) {
      // O Upstash/Redis client já faz o JSON.parse automaticamente se detectar JSON,
      // mas garantimos que retornamos o objeto correto.
      return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
    }

    // 2. Se não achou (Cache Miss), busca do banco de dados
    const data = await fetchFunction();

    // 3. Salva no Redis com expiração (TTL)
    // Se data for null ou undefined, não cacheamos para evitar erros
    if (data) {
      await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
    }

    return data;
  } catch (error) {
    console.error(`Erro de Cache Redis para chave ${key}:`, error);
    // Em caso de erro no Redis, fallback para o banco de dados direto
    return await fetchFunction();
  }
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