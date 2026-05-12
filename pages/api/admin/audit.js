import { query } from '../../../lib/db';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';

async function handleGet(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = (page - 1) * limit;
    const { startDate, endDate } = req.query;

    let whereClause = '';
    const queryParams = [];
    const countParams = [];

    if (startDate || endDate) {
      const conditions = [];
      if (startDate) {
        queryParams.push(startDate);
        countParams.push(startDate);
        conditions.push(`created_at >= $${queryParams.length}`);
      }
      if (endDate) {
        queryParams.push(endDate);
        countParams.push(endDate);
        conditions.push(`created_at <= $${queryParams.length}`);
      }
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    queryParams.push(limit, offset);
    const limitIdx = queryParams.length - 1;
    const offsetIdx = queryParams.length;

    const countRes = await query(`SELECT COUNT(*) FROM activity_logs ${whereClause}`, countParams);
    const total = parseInt(countRes?.rows[0]?.count || '0', 10);
    const totalPages = Math.ceil(total / limit) || 1;

    const { rows } = await query(`SELECT * FROM activity_logs ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`, queryParams);
    // Formata user_id baseando-se no username registrado nas tabelas de logs
    const logs = rows.map(r => ({ ...r, user_id: r.username }));
    return res.status(200).json({ data: logs, pagination: { page, limit, total, totalPages } });
  } catch (e) {
    if (e.code === '42P01') {
      // Garante que a tabela exista se for uma instalação limpa
      await query(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255),
          action VARCHAR(255),
          entity_type VARCHAR(255),
          entity_id INTEGER,
          details TEXT,
          ip_address VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return res.status(200).json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } });
    }
    throw e;
  }
}

export default createAdminHandler({
  name: 'Audit',
  permission: ['Auditoria', 'Segurança'],
  allowedMethods: ['GET'],
  handlers: { GET: handleGet },
  rateLimit: { max: 30, window: 60000 },
});