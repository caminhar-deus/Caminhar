import { query, createVideo } from '../../lib/db';
import { getAuthToken, verifyToken } from '../../lib/auth';

export default async function handler(req, res) {
  // POST - Create video (Protected)
  if (req.method === 'POST') {
    const token = getAuthToken(req);
    const user = verifyToken(token);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const video = await createVideo(req.body);
      return res.status(201).json({ success: true, data: video });
    } catch (error) {
      console.error('API Error creating video:', error);
      return res.status(500).json({ success: false, message: 'Erro ao criar vídeo', details: error.message });
    }
  }

  // GET - List videos (Public)
  if (req.method === 'GET') {
  try {
    const { search } = req.query;
    let text = 'SELECT id, titulo, url_youtube, descricao FROM videos WHERE publicado = true';
    const params = [];

    if (search) {
      text += ' AND (titulo ILIKE $1 OR descricao ILIKE $1)';
      params.push(`%${search.toLowerCase()}%`);
    }

    text += ' ORDER BY created_at DESC';

    const result = await query(text, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('API Error fetching videos:', error);
    return res.status(500).json({ message: 'Erro interno do servidor ao buscar vídeos.', details: error.message });
  }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}