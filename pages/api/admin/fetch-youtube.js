import { getAuthToken, verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Segurança: Apenas administradores podem usar esta rota
  const token = getAuthToken(req);
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL do YouTube não fornecida.' });

  try {
    // Utiliza a API oEmbed pública do YouTube
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) throw new Error('Não foi possível encontrar o vídeo. Verifique se o link é válido e público.');

    const data = await response.json();

    return res.status(200).json({ title: data.title || '' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}