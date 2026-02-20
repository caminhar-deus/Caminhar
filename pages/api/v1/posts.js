import { getOrSetCache, invalidateCache } from '../../../lib/cache';
import * as db from '../../../lib/db';
import { getAuthToken, verifyToken } from '../../../lib/auth';

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
      const result = await db.query(
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

    // Validação básica
    const { title, slug, content } = req.body;
    if (!title || !slug || !content) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando' });
    }

    const newPost = await db.createPost(req.body);

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