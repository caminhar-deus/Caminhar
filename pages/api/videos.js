import { getPublicPaginatedVideos } from '../../lib/domain/videos.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache.js';
import { getClientIP } from '../../lib/api/helpers.js';
import { logger } from '../../lib/logger.js';

/**
 * Mapeamento dos valores de sort para cláusulas ORDER BY.
 */
const SORT_MAP = {
  recent: 'created_at DESC',
  oldest: 'created_at ASC',
  alpha: 'titulo ASC',
  alpha_desc: 'titulo DESC',
};

/**
 * API route handler for fetching public videos.
 * GET /api/videos?page=1&limit=6&search=&sort=recent
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  try {
    const parsedPage = parseInt(req.query.page);
    const page = !isNaN(parsedPage) ? parsedPage : 1;

    const parsedLimit = parseInt(req.query.limit);
    const limit = !isNaN(parsedLimit) ? parsedLimit : 10;

    const search = req.query.search || '';
    const sort = req.query.sort || 'recent';

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Bad Request', message: 'Parâmetros de paginação inválidos' });
    }

    // Mapeia o valor de sort para cláusula ORDER BY, ou usa default
    const orderBy = SORT_MAP[sort] || SORT_MAP.recent;

    // Rate limit ANTES do cache — garante proteção mesmo em cache hits
    const ip = getClientIP(req);
    const isRateLimited = await checkRateLimit(ip, 'api:public:videos');
    if (isRateLimited) {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }

    const cacheKey = `public_videos:${page}:${limit}${search ? `:${search}` : ''}:${sort}`;
    const result = await getOrSetCache(cacheKey, async () => {
      return await getPublicPaginatedVideos(page, limit, search, orderBy);
    });

    // Cache público: CDN/Proxy pode cachear por 5 minutos, com stale-while-revalidate de 10 minutos
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Videos', 'Erro ao buscar vídeos públicos:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno do servidor ao buscar vídeos' });
  }
}