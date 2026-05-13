import { query } from '../../lib/db.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed', message: `Método ${req.method} não permitido` });
  }

  try {
    const cacheKey = 'dicas:public:published';
    const result = await getOrSetCache(cacheKey, async () => {
      // Rate limiting em endpoint público
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const isRateLimited = await checkRateLimit(ip, 'api:public:dicas', 60, 60000);
      if (isRateLimited) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      const dbResult = await query(
        'SELECT id, name, content FROM dicas WHERE published = true ORDER BY id ASC'
      );
      return dbResult.rows;
    });

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }
    console.error('API Error fetching dicas:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao buscar as dicas do dia' });
  }
}