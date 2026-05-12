import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';

async function handlePost(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL do YouTube não fornecida.' });

  // Utiliza a API oEmbed pública do YouTube
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const response = await fetch(oembedUrl);

  if (!response.ok) throw new Error('Não foi possível encontrar o vídeo. Verifique se o link é válido e público.');

  const data = await response.json();

  req.adminUtils.logActivity('FETCH YOUTUBE', Date.now(), `Buscou dados do vídeo: ${data.title}`);
  return res.status(200).json({ title: data.title || '' });
}

export default createAdminHandler({
  name: 'YouTube',
  allowedMethods: ['POST'],
  handlers: { POST: handlePost },
});