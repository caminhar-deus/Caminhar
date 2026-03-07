import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    // Cache por 60 segundos (fresco), permite uso de cache antigo por mais 5 minutos enquanto revalida
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    const { search, page: pageStr, limit: limitStr } = req.query;
    const page = Math.max(1, parseInt(pageStr) || 1);
    const limit = Math.max(1, parseInt(limitStr) || 10);
    const offset = (page - 1) * limit;

    let text = 'SELECT id, titulo, artista, url_spotify, descricao FROM musicas WHERE publicado = true';
    const params = [];
    let paramIndex = 1;

    if (search) {
      const searchStr = Array.isArray(search) ? search[0] : search;
      text += ` AND (titulo ILIKE $${paramIndex} OR artista ILIKE $${paramIndex})`;
      params.push(`%${searchStr.toLowerCase()}%`);
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