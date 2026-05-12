import { query } from '../../../lib/db.js';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';

async function handleGet(req, res) {
  const result = await query('SELECT * FROM dicas ORDER BY id ASC');
  return res.status(200).json({ data: result.rows });
}

async function handlePost(req, res) {
  const { name, content, published } = req.body;
  const result = await query(
    'INSERT INTO dicas (name, content, published) VALUES ($1, $2, $3) RETURNING *',
    [name, content, published !== undefined ? published : true],
  );
  req.adminUtils.logActivity('CRIAR DICA', result.rows[0].id, `Criou a dica: ${name}`);
  return res.status(201).json(result.rows[0]);
}

async function handlePut(req, res) {
  const { id, name, content, published } = req.body;
  const result = await query(
    'UPDATE dicas SET name = $1, content = $2, published = $3 WHERE id = $4 RETURNING *',
    [name, content, published !== undefined ? published : true, id],
  );
  req.adminUtils.logActivity('ATUALIZAR DICA', id, `Atualizou a dica: ${name}`);
  return res.status(200).json(result.rows[0]);
}

async function handleDelete(req, res) {
  const { id } = req.body;
  const dicaQueryToDel = await query('SELECT name FROM dicas WHERE id = $1', [id]);
  const nameDica = dicaQueryToDel.rows[0]?.name || id;
  await query('DELETE FROM dicas WHERE id = $1', [id]);
  req.adminUtils.logActivity('EXCLUIR DICA', id, `Removeu a dica: ${nameDica}`);
  return res.status(200).json({ success: true });
}

export default createAdminHandler({
  name: 'Dica',
  handlers: { GET: handleGet, POST: handlePost, PUT: handlePut, DELETE: handleDelete },
  rateLimit: { max: 30, window: 60000 },
});