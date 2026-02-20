import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { search, page: pageStr, limit: limitStr } = req.query;
    const page = parseInt(pageStr) || 1;
    const limit = parseInt(limitStr) || 10;
    const offset = (page - 1) * limit;

    let text = 'SELECT id, titulo, artista, url_spotify, descricao FROM musicas WHERE publicado = true';
    const params = [];
    let paramIndex = 1;

    if (search) {
      text += ` AND (titulo ILIKE $${paramIndex} OR artista ILIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    text += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(text, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('API Error fetching musicas:', error);
    return res.status(500).json({ message: 'Erro interno do servidor ao buscar músicas.', details: error.message });
  }
}