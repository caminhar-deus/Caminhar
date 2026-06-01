import { getRecentPosts, createPost } from '../../lib/domain/posts.js';
import { getOrSetCache, checkRateLimit, invalidateCache } from '../../lib/cache.js';
import { withAuth } from '../../lib/auth.js';
import { z } from 'zod';
import { getClientIP } from '../../lib/api/helpers.js';
import { logger } from '../../lib/logger.js';

/**
 * API route handler for posts.
 * GET /api/posts?page=1&limit=10&search= — Lista posts públicos com paginação e cache
 * POST /api/posts?response=v1 — Cria post (autenticado)
 *
 * Query params:
 *   ?response=v1 — Formata resposta no padrão { success, data, ... } (compatível com v1)
 */
export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
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
      return res.status(400).json({ error: 'Bad Request', message: 'Parâmetros de paginação inválidos' });
    }

    const ip = getClientIP(req);

    // Chave de cache mais eficiente: separa listagem de busca
    // Listagens sem search têm alta taxa de cache hit entre diferentes usuários
    const cacheKey = search
      ? `posts:search:${page}:${limit}:${search.toLowerCase().trim()}`
      : `posts:list:${page}:${limit}`;

    // TTL maior para listagens (2h), menor para buscas (30min)
    const ttl = search ? 1800 : 7200;

    // Executa cache em paralelo com rate limit — cache hits não são bloqueados
    const [result] = await Promise.all([
      getOrSetCache(cacheKey, async () => {
        return await getRecentPosts(limit, page, search);
      }, ttl),
      // Rate limit com limite mais generoso para não barrar tráfego legítimo sob carga
      checkRateLimit(ip, 'api:public:posts', search ? 100 : 300),
    ]);

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
    logger.error('Posts', 'Erro ao buscar posts:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno do servidor ao buscar posts' });
  }
}

/**
 * POST: Cria post com autenticação (via withAuth) e validação Zod
 * Handler interno — a autenticação é garantida pelo withAuth
 */
async function postHandler(req, res) {
  try {
    // Rate limit em mutações — usando getClientIP (seguro contra spoofing)
    const ip = getClientIP(req);
    const isRateLimited = await checkRateLimit(ip, 'api:posts:create', 30, 60000);
    if (isRateLimited) {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }

    // Schema de validação Zod (mesmo schema usado no admin para consistência)
    const postCreateSchema = z.object({
      title: z.string().min(1, 'Título é obrigatório'),
      slug: z.string().min(1, 'Slug é obrigatório'),
      excerpt: z.string().optional(),
      content: z.string().optional(),
      image_url: z.string().refine(val =>
        !val || val === '' || val.startsWith('http') || val.startsWith('/'), {
        message: 'A URL da imagem deve ser um link completo (https://...) ou um caminho local válido (/uploads/...).'
      }).optional(),
      published: z.boolean().optional(),
    });

    const validationResult = postCreateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Dados inválidos para criação de post',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const newPost = await createPost(validationResult.data);

    // Invalida o cache público — limpa tanto o padrão antigo quanto o novo
    await invalidateCache('posts:list:*');
    await invalidateCache('posts:search:*');
    await invalidateCache('posts:*');

    // Formato de resposta compatível com v1 quando ?response=v1
    if (req.query.response === 'v1') {
      return res.status(201).json({
        success: true,
        data: newPost,
        message: 'Post criado com sucesso',
      });
    }

    return res.status(201).json(newPost);
  } catch (error) {
    logger.error('Posts', 'Erro ao criar post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao criar post' });
  }
}

// Protege o POST com autenticação
const handlePost = withAuth(postHandler);