import { query } from '../../../lib/db';
import { getAuthToken, verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  
  const user = verifyToken(token);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10); // Exibe mais linhas na auditoria
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];
    const countParams = [];

    if (search) {
      whereClause = 'WHERE LOWER(username) LIKE $1 OR LOWER(action) LIKE $1 OR LOWER(entity_type) LIKE $1 OR LOWER(details) LIKE $1';
      const searchPattern = `%${search.toLowerCase()}%`;
      params.push(searchPattern);
      countParams.push(searchPattern);
    }

    params.push(limit, offset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;

    const countRes = await query(`SELECT COUNT(*) FROM activity_logs ${whereClause}`, countParams);
    const total = parseInt(countRes?.rows[0]?.count || '0', 10);
    const totalPages = Math.ceil(total / limit) || 1;

    const dataRes = await query(`SELECT * FROM activity_logs ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`, params);

    return res.status(200).json({ data: dataRes?.rows || [], pagination: { page, limit, total, totalPages } });
  } catch (error) {
    console.error('❌ [API Logs] Error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}