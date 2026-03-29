import { getRecentPosts } from '../../lib/domain/posts.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache.js';

/**
 * API route handler for fetching posts
 * GET /api/posts?page=1&limit=10
 */
export default async function handler(req, res) {
  // Apenas método GET é permitido
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

    // Verifica rate limit
    const isRateLimited = await checkRateLimit(ip, 'api:public:posts');
    if (isRateLimited) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    // Extrai parâmetros de query
    // Corrigido para tratar '0' como um valor válido para validação, em vez de usar o default.
    // O `||` resultava em `1` quando o valor era `0`, que é "falsy".
    const parsedPage = parseInt(req.query.page);
    const page = !isNaN(parsedPage) ? parsedPage : 1;

    const parsedLimit = parseInt(req.query.limit);
    const limit = !isNaN(parsedLimit) ? parsedLimit : 10;

    // Validação básica
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    // Busca posts com cache
    const cacheKey = `posts:${page}:${limit}`;
    const result = await getOrSetCache(cacheKey, async () => {
      return await getRecentPosts(limit, page);
    });

    // Retorna a resposta no formato padronizado esperado pelo frontend,
    // incluindo um indicador de sucesso.
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}