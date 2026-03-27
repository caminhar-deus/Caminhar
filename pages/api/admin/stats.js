import { query } from '../../../lib/db';
import { getAuthToken, verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Proteção da Rota
  const token = getAuthToken(req);
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    // Executa as contagens simultaneamente para maior performance
    const [
      postsRes, musicasRes, videosRes, productsRes, 
      productsPubRes, productsDraftRes, usersRes,
      postsPubRes, postsDraftRes,
      musicasPubRes, musicasDraftRes,
      videosPubRes, videosDraftRes,
      usersTodayRes, usersMonthRes, usersYearRes,
      dicasRes, dicasPubRes, dicasDraftRes
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM posts'),
      query('SELECT COUNT(*) FROM musicas'),
      query('SELECT COUNT(*) FROM videos'),
      query('SELECT COUNT(*) FROM products'),
      query('SELECT COUNT(*) FROM products WHERE published = true'),
      query('SELECT COUNT(*) FROM products WHERE published = false'),
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM posts WHERE published = true'),
      query('SELECT COUNT(*) FROM posts WHERE published = false'),
      query('SELECT COUNT(*) FROM musicas WHERE publicado = true'),
      query('SELECT COUNT(*) FROM musicas WHERE publicado = false'),
      query('SELECT COUNT(*) FROM videos WHERE publicado = true'),
      query('SELECT COUNT(*) FROM videos WHERE publicado = false'),
      query('SELECT COUNT(*) FROM users WHERE last_login_at >= CURRENT_DATE'), // Logados Hoje
      query("SELECT COUNT(*) FROM users WHERE last_login_at >= date_trunc('month', CURRENT_DATE)"), // Logados no Mês
      query("SELECT COUNT(*) FROM users WHERE last_login_at >= date_trunc('year', CURRENT_DATE)"), // Logados no Ano
      query('SELECT COUNT(*) FROM dicas'),
      query('SELECT COUNT(*) FROM dicas WHERE published = true'),
      query('SELECT COUNT(*) FROM dicas WHERE published = false')
    ]);

    return res.status(200).json({
      posts: parseInt(postsRes?.rows[0]?.count || 0, 10),
      postsPublished: parseInt(postsPubRes?.rows[0]?.count || 0, 10),
      postsDraft: parseInt(postsDraftRes?.rows[0]?.count || 0, 10),
      musicas: parseInt(musicasRes?.rows[0]?.count || 0, 10),
      musicasPublished: parseInt(musicasPubRes?.rows[0]?.count || 0, 10),
      musicasDraft: parseInt(musicasDraftRes?.rows[0]?.count || 0, 10),
      videos: parseInt(videosRes?.rows[0]?.count || 0, 10),
      videosPublished: parseInt(videosPubRes?.rows[0]?.count || 0, 10),
      videosDraft: parseInt(videosDraftRes?.rows[0]?.count || 0, 10),
      products: parseInt(productsRes?.rows[0]?.count || 0, 10),
      productsPublished: parseInt(productsPubRes?.rows[0]?.count || 0, 10),
      productsDraft: parseInt(productsDraftRes?.rows[0]?.count || 0, 10),
      users: parseInt(usersRes?.rows[0]?.count || 0, 10),
      usersToday: parseInt(usersTodayRes?.rows[0]?.count || 0, 10),
      usersMonth: parseInt(usersMonthRes?.rows[0]?.count || 0, 10),
      usersYear: parseInt(usersYearRes?.rows[0]?.count || 0, 10),
      dicas: parseInt(dicasRes?.rows[0]?.count || 0, 10),
      dicasPublished: parseInt(dicasPubRes?.rows[0]?.count || 0, 10),
      dicasDraft: parseInt(dicasDraftRes?.rows[0]?.count || 0, 10),
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do painel:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}