import { getRecentPosts } from '../../lib/domain/posts.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache/cache.js';
import { getClientIP, INVALID_PAGINATION_MESSAGE } from '../../lib/api/helpers.js';
import { logger } from '../../lib/infra/logger.js';

/**
 * API route handler for posts — rota somente leitura (GET).
 * GET /api/posts?page=1&limit=10&search= — Lista posts públicos com paginação e cache
 * A criação de post é feita pelo painel em /api/admin/posts (exige a permissão Posts/Artigos).
 *
 * Query params:
 *   ?response=v1 — Formata resposta no padrão { success, data, ... } (compatível com v1)
 */
export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    default:
      return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }
}

/**
 * GET: Lista posts públicos com paginação, cache e rate limiting
 */
async function handleGet(req, res) {
  try {
    const parsedPage = parseInt(req.query.page);
    const page = !isNaN(parsedPage) ? parsedPage : 1;

    const parsedLimit = parseInt(req.query.limit);
    const limit = !isNaN(parsedLimit) ? parsedLimit : 10;

    const search = req.query.search || '';

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Bad Request', message: INVALID_PAGINATION_MESSAGE });
    }

    // Chave de cache mais eficiente: separa listagem de busca
    // Listagens sem search têm alta taxa de cache hit entre diferentes usuários
    const cacheKey = search
      ? `posts:search:${page}:${limit}:${search.toLowerCase().trim()}`
      : `posts:list:${page}:${limit}`;

    // TTL maior para listagens (2h), menor para buscas (30min)
    const ttl = search ? 1800 : 7200;

    const result = await getOrSetCache(cacheKey, async () => {
      const ip = getClientIP(req);

      // Verifica rate limit dentro do callback de cache para evitar latência desnecessária
      // em hits de cache (quando o rate limit já foi verificado anteriormente)
      const isLimited = await checkRateLimit(ip, 'api:public:posts', search ? 100 : 300);
      if (isLimited) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      return await getRecentPosts(limit, page, search);
    }, ttl);

    // Cache público: CDN/Proxy pode cachear por 5 minutos, com stale-while-revalidate de 10 minutos
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');

    // Formato de resposta compatível com v1 quando ?response=v1
    if (req.query.response === 'v1') {
      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }
    logger.error('Posts', 'Erro ao buscar posts:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno do servidor ao buscar posts' });
  }
}