import { getRecentPosts } from '../../lib/domain/posts.js';
import { getOrSetCache } from '../../lib/cache.js';
import { z } from 'zod';

export default async function handler(req, res) {
  // Permite apenas método GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    // Validação de entrada com Zod para maior robustez
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().default(10),
    });

    const validation = querySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Parâmetros inválidos', errors: validation.error.flatten().fieldErrors });
    }

    const { page, limit } = validation.data;
    const cacheKey = `posts:public:page:${page}:limit:${limit}`;

    // Implementa cache para melhorar a performance
    const result = await getOrSetCache(cacheKey, async () => {
      // A função que busca os dados só será executada se não houver cache
      return await getRecentPosts(limit, page);
    }, 3600); // Cache de 1 hora
    
    // Garante que, mesmo que o cache ou a função de domínio retornem algo inesperado, a API não quebre.
    // Retorna os dados em um formato padronizado
    return res.status(200).json({
      success: true,
      data: result?.data || [],
      pagination: result?.pagination || {},
    });
  } catch (error) {
    console.error('API Error fetching posts:', error);
    // Resposta de erro padronizada
    return res.status(500).json({ success: false, message: 'Erro interno ao carregar posts' });
  }
}