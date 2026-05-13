import { withAuth } from '../../lib/auth';
import { query } from '../../lib/db';

async function handler(req, res) {
  // Apenas permite DELETE
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  // Segurança adicional: Verifica se é admin (já garantido pelo withAuth, mas reforçando)
  if (req.user.username !== process.env.ADMIN_USERNAME && req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Apenas administradores podem limpar dados de teste' });
  }

  try {
    const result = await query("DELETE FROM posts WHERE slug LIKE 'post-carga-%'");
    // PostgreSQL retorna rowCount em vez de changes
    return res.status(200).json({ message: 'Dados de teste limpos com sucesso', changes: result.rowCount });
  } catch (error) {
    console.error('Error cleaning test data:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao limpar dados' });
  }
}

export default withAuth(handler);