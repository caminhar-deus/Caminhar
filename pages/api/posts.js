import { getRecentPosts } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const posts = await getRecentPosts();
      res.status(200).json(posts);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Erro ao carregar posts' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}