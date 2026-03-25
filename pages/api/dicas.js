import { query } from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const result = await query('SELECT id, name, content FROM dicas WHERE published = true ORDER BY id ASC');
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao buscar as dicas do dia' });
  }
}