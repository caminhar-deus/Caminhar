import { getOrSetCache, invalidateCache } from '../../../lib/cache';
import * as db from '../../../lib/db';
import { getAuthToken, verifyToken } from '../../../lib/auth';
import { z } from 'zod';

// Reutiliza o mesmo schema de validação do endpoint de admin para consistência
const postCreateSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  // Adicione outros campos conforme necessário (excerpt, image_url, etc.)
});

export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
}

async function handleGet(req, res) {
  try {
    // Cache key: 'posts:public:all'
    // TTL: 3600 segundos (1 hora)
    const posts = await getOrSetCache('posts:public:all', async () => {
      // Busca apenas posts publicados, ordenados por data
      const result = await db.query( // Assumindo que db.query existe e funciona
        `SELECT id, title, slug, summary, image_url, created_at 
         FROM posts 
         WHERE published = true 
         ORDER BY created_at DESC`
      );
      return result.rows;
    }, 3600);

    return res.status(200).json({
      success: true,
      data: posts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error', 
      message: 'Erro ao carregar postagens' 
    });
  }
}

async function handlePost(req, res) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    // NOTA: Considerar adicionar verificação de role/permissão aqui se necessário.
    // Ex: if (user.role !== 'api_user') { ... }

    // Validação de entrada robusta com Zod
    const validationResult = postCreateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dados inválidos para criação de post', 
        errors: validationResult.error.flatten().fieldErrors 
      });
    }

    const newPost = await db.createPost(validationResult.data);

    // Invalida o cache da lista pública
    await invalidateCache('posts:public:all');

    return res.status(201).json({
      success: true,
      data: newPost,
      message: 'Post criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar post:', error);
    return res.status(500).json({ success: false, message: 'Erro ao criar post' });
  }
}