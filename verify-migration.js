import { withAuth } from '../../../lib/auth';
import { query } from '../../../lib/db';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Executa contagens em paralelo para performance
    const [usersRes, postsRes, settingsRes, imagesRes] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM posts'),
      query('SELECT COUNT(*) as count FROM settings'),
      query('SELECT COUNT(*) as count FROM images')
    ]);

    // Busca amostra dos últimos posts para verificação visual
    const latestPostsRes = await query(
      'SELECT id, title, slug, published, created_at FROM posts ORDER BY created_at DESC LIMIT 5'
    );

    return res.status(200).json({
      success: true,
      message: 'Verificação de integridade realizada com sucesso',
      database: 'PostgreSQL',
      counts: {
        users: parseInt(usersRes.rows[0].count, 10),
        posts: parseInt(postsRes.rows[0].count, 10),
        settings: parseInt(settingsRes.rows[0].count, 10),
        images: parseInt(imagesRes.rows[0].count, 10)
      },
      samples: {
        latest_posts: latestPostsRes.rows
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na verificação de integridade:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Falha na verificação de integridade. Verifique se as tabelas foram criadas.', 
      error: error.message 
    });
  }
}

export default withAuth(handler);