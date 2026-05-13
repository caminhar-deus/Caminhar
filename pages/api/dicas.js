import { query } from '../../lib/db.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache.js';
import { paginate, buildPaginationMeta, paginatedResponse } from './helper/pagination.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed', message: `Método ${req.method} não permitido` });
  }

  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    const cacheKey = `dicas:public:published:${page}:${limit}`;
    const result = await getOrSetCache(cacheKey, async () => {
      // Rate limiting em endpoint público
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const isRateLimited = await checkRateLimit(ip, 'api:public:dicas', 60, 60000);
      if (isRateLimited) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      const [totalResult, dbResult] = await Promise.all([
        query('SELECT COUNT(*) FROM dicas WHERE published = true'),
        query(
          'SELECT id, name, content FROM dicas WHERE published = true ORDER BY id ASC LIMIT $1 OFFSET $2',
          [limit, offset]
        ),
      ]);

      const total = parseInt(totalResult.rows[0]?.count || '0', 10);

      return {
        data: dbResult.rows,
        pagination: buildPaginationMeta(page, limit, total),
      };
    });

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(paginatedResponse(result.data, result.pagination));
  } catch (error) {
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }
    if (error.message === 'INVALID_PAGINATION_PARAMS') {
      return res.status(400).json({ error: 'Bad Request', message: 'Parâmetros de paginação inválidos' });
    }
    console.error('API Error fetching dicas:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao buscar as dicas do dia' });
  }
}
