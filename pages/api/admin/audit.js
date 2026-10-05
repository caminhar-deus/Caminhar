import { query } from '../../../lib/infra/db';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { logger } from '../../../lib/infra/logger.js';

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
      // Schema é responsabilidade das migrações (`npm run migrate`), não do
      // path de request: o CREATE TABLE inline foi removido (código morto — a
      // migração 006 já cria a tabela — e com entity_id INTEGER divergia da 011,
      // que converte para BIGINT).
      logger.error('Audit', 'Schema desatualizado: tabela "activity_logs" ausente. Execute "npm run migrate".', e);
      return res.status(500).json({
        error: 'Erro interno no servidor',
        message: 'Schema desatualizado: tabela "activity_logs" ausente. Execute "npm run migrate".',
      });
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