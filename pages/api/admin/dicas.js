import { query, logActivity } from '../../../lib/db.js';
import { withAuth } from '../../../lib/auth.js';

async function handler(req, res) {
  const { method } = req;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const user = req.user;

  switch (method) {
    case 'GET':
      try {
        const result = await query('SELECT * FROM dicas ORDER BY id ASC');
        res.status(200).json({ data: result.rows });
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dicas' });
      }
      break;

    case 'POST':
      try {
        const { name, content, published } = req.body;
        const result = await query(
          'INSERT INTO dicas (name, content, published) VALUES ($1, $2, $3) RETURNING *',
          [name, content, published !== undefined ? published : true]
        );
        if (user) await logActivity(user.username, 'CRIAR DICA', 'POST', result.rows[0].id, `Criou a dica: ${name}`, ip);
        res.status(201).json(result.rows[0]);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao criar dica' });
      }
      break;

    case 'PUT':
      try {
        const { id, name, content, published } = req.body;
        const result = await query(
          'UPDATE dicas SET name = $1, content = $2, published = $3 WHERE id = $4 RETURNING *',
          [name, content, published !== undefined ? published : true, id]
        );
        if (user) await logActivity(user.username, 'ATUALIZAR DICA', 'PUT', id, `Atualizou a dica: ${name}`, ip);
        res.status(200).json(result.rows[0]);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar dica' });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.body;
        await query('DELETE FROM dicas WHERE id = $1', [id]);
        if (user) await logActivity(user.username, 'EXCLUIR DICA', 'DELETE', id, `Removeu a dica ID: ${id}`, ip);
        res.status(200).json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir dica' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Método ${method} não permitido`);
  }
}
export default withAuth(handler);