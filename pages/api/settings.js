import { withAuth } from '../../lib/auth';
import { query } from '../../lib/db';

async function handler(req, res) {
  try {
    // GET: Listar configurações
    if (req.method === 'GET') {
      const { key } = req.query;
      
      if (key) {
        const result = await query('SELECT * FROM settings WHERE key = $1', [key]);
        if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Configuração não encontrada' });
        }
        return res.status(200).json(result.rows[0]);
      }

      const result = await query('SELECT * FROM settings');
      // Converte array de settings para objeto { key: value } para facilitar uso no frontend
      const settings = result.rows.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      
      return res.status(200).json(settings);
    }

    // PUT: Atualizar configuração
    if (req.method === 'PUT') {
      const { key, value, type, description } = req.body;
      
      await query(
        `INSERT INTO settings (key, value, type, description, updated_at) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value, type || 'string', description || '']
      );
      
      return res.status(200).json({ message: 'Configuração salva com sucesso' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno', error: error.message });
  }
}

export default withAuth(handler); // Protege a rota (exceto GET se necessário, mas aqui protegemos tudo ou ajustamos conforme auth.js)