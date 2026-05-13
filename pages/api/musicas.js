import { getPaginatedMusicas } from '../../lib/domain/musicas.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache.js';
import { z } from 'zod';

/**
 * Handles GET requests to fetch paginated and published music data.
 */
async function handleGet(req, res) {
  try {
    // Valida e sanitiza os parâmetros de entrada com Zod para maior robustez.
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().default(10),
      search: z.string().optional(),
    });

    const validation = querySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Parâmetros inválidos.',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { page, limit, search } = validation.data;

    // Define uma política de cache para a resposta.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    // Cache com rate limiting integrado
    const cacheKey = `musicas:${page}:${limit}${search ? `:${search}` : ''}`;
    const result = await getOrSetCache(cacheKey, async () => {
      // Rate limiting em endpoint público
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const isRateLimited = await checkRateLimit(ip, 'api:public:musicas', 60, 60000);
      if (isRateLimited) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      // Busca os dados utilizando a função de domínio, garantindo que apenas músicas publicadas sejam retornadas.
      return await getPaginatedMusicas(page, limit, search, true);
    });

    // Retorna os dados em um formato padronizado e estruturado.
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }
    console.error('API Error fetching musicas:', error);
    // Resposta de erro padronizada.
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor ao buscar músicas.',
    });
  }
}

/**
 * Handler principal da rota /api/musicas.
 * Direciona as requisições para o handler do método HTTP correspondente.
 */
export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method Not Allowed', message: `Método ${req.method} não permitido` });
  }
}