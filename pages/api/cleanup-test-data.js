import { withAuth } from '../../../lib/auth';
import { query } from '../../../lib/db';

async function handler(req, res) {
  // Apenas permite DELETE
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Segurança adicional: Verifica se é admin (já garantido pelo withAuth, mas reforçando)
  if (req.user.username !== process.env.ADMIN_USERNAME && req.user.username !== 'admin') {
    return res.status(403).json({ message: 'Apenas administradores podem limpar dados de teste' });
  }

  try {
    const result = await query("DELETE FROM posts WHERE slug LIKE 'post-carga-%'");
    // PostgreSQL retorna rowCount em vez de changes
    return res.status(200).json({ message: 'Dados de teste limpos com sucesso', changes: result.rowCount });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao limpar dados', error: error.message });
  }
}

export default withAuth(handler);