import { getOrSetCache } from '../../../lib/cache';
import db from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed', 
      message: 'Apenas método GET é permitido' 
    });
  }

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