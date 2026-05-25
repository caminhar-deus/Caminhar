import { getRecentPosts, createPost } from '../../lib/domain/posts.js';
import { getOrSetCache, checkRateLimit, invalidateCache } from '../../lib/cache.js';
import { withAuth } from '../../lib/auth.js';
import { z } from 'zod';
import { getClientIP } from '../../lib/api/helpers.js';

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

    const cacheKey = `posts:${page}:${limit}${search ? `:${search}` : ''}`;
    const result = await getOrSetCache(cacheKey, async () => {
      const ip = getClientIP(req);
      const isRateLimited = await checkRateLimit(ip, 'api:public:posts');
      if (isRateLimited) {
        const rateLimitError = new Error('RATE_LIMIT_EXCEEDED');
        throw rateLimitError;
      }
      return await getRecentPosts(limit, page, search);
    });

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
    console.error('Error fetching posts:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno do servidor ao buscar posts' });
  }
}

/**
 * POST: Cria post com autenticação (via withAuth) e validação Zod
 * Handler interno — a autenticação é garantida pelo withAuth
 */
async function postHandler(req, res) {
  try {
    // Rate limit em mutações
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
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

    // Invalida o cache público
    await invalidateCache('posts:public:all');

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
    console.error('Error creating post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao criar post' });
  }
}

// Protege o POST com autenticação
const handlePost = withAuth(postHandler);