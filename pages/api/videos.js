import { getPublicPaginatedVideos } from '../../lib/domain/videos.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache/cache.js';
import { z } from 'zod';
import { getClientIP, INVALID_PAGINATION_MESSAGE, INVALID_PARAMS_MESSAGE } from '../../lib/api/helpers.js';
import { logger } from '../../lib/infra/logger.js';

/**
 * Mapeamento dos valores de sort para cláusulas ORDER BY.
 * Todas as cláusulas têm desempate determinístico por `id` na MESMA direção
 * da coluna principal — sem ele, itens com o mesmo valor da coluna poderiam
 * trocar de posição entre páginas (ordem não determinística na paginação).
 */
const SORT_MAP = {
  recent: 'created_at DESC, id DESC',
  oldest: 'created_at ASC, id ASC',
  alpha: 'titulo ASC, id ASC',
  alpha_desc: 'titulo DESC, id DESC',
};

/**
 * API route handler for fetching public videos.
 * GET /api/videos?page=1&limit=12&search=&sort=recent
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  try {
    // Valida e sanitiza os parâmetros de entrada com Zod (mesmo padrão de
    // musicas.js). `sort` é enum ESTREITO: valor fora do contrato vira 400 em
    // vez de cair silenciosamente no fallback `recent` — antes, um script que
    // mandasse `?sort=created_at` recebia o default e "passava" sem validar o
    // parâmetro (lição do cron #19 / correção 23/10/2026).
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      // Teto igual ao das demais rotas paginadas (posts, musicas, products,
      // dicas) — sem `.max()`, `?limit=1000` devolvia 200 com 1000 itens (ADR-0009).
      limit: z.coerce.number().int().positive().max(100, INVALID_PAGINATION_MESSAGE).default(10),
      search: z.string().max(200).optional(),
      sort: z.enum(['recent', 'oldest', 'alpha', 'alpha_desc']).optional().default('recent'),
    });

    const validation = querySchema.safeParse(req.query);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      // Erro de paginação devolve a MESMA string das demais rotas
      // (`musicas.js:30`); erros de `search`/`sort` mantêm o texto genérico.
      const isPaginationError = Boolean(errors.page?.length || errors.limit?.length);
      return res.status(400).json({
        error: 'Bad Request',
        message: isPaginationError ? INVALID_PAGINATION_MESSAGE : INVALID_PARAMS_MESSAGE,
        errors,
      });
    }

    const { page, limit, search = '', sort } = validation.data;

    // Mapeia o valor VALIDADO de sort para cláusula ORDER BY (com desempate
    // por `id`). Nunca usa o valor cru da query.
    const orderBy = SORT_MAP[sort];

    // Rate limit ANTES do cache — garante proteção mesmo em cache hits.
    // (Diferente de musicas.js, que aplica dentro do callback: aqui a ordem
    // é intencional e preservada.)
    const ip = getClientIP(req);
    const isRateLimited = await checkRateLimit(ip, 'api:public:videos');
    if (isRateLimited) {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }

    // Chave usa `sort`/`search` já validados pelo Zod (nunca o valor cru).
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
