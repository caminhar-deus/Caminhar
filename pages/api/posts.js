import { getRecentPosts } from '../../lib/db.js';

export default async function handler(req, res) {
  // Permite apenas método GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Busca apenas posts publicados (lógica encapsulada no getRecentPosts)
    const posts = await getRecentPosts(limit, page);
    
    // Retorna os dados como JSON
    return res.status(200).json(posts);
  } catch (error) {
    console.error('API Error fetching posts:', error);
    return res.status(500).json({ message: 'Erro interno ao carregar posts' });
  }
}