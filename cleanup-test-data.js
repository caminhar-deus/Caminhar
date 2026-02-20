import { withAuth } from '../../../lib/auth';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function handler(req, res) {
  // Apenas permite DELETE
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Segurança adicional: Verifica se é admin (já garantido pelo withAuth, mas reforçando)
  if (req.user.username !== process.env.ADMIN_USERNAME && req.user.username !== 'admin') {
    return res.status(403).json({ message: 'Apenas administradores podem limpar dados de teste' });
  }

  const dbPath = path.join(process.cwd(), 'data', 'caminhar.db');
  
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    const result = await db.run("DELETE FROM posts WHERE slug LIKE 'post-carga-%'");
    await db.close();

    return res.status(200).json({ message: 'Dados de teste limpos com sucesso', changes: result.changes });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao limpar dados', error: error.message });
  }
}

export default withAuth(handler);