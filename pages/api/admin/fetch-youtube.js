import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { z } from 'zod';

const FETCH_TIMEOUT = 8000; // 8 segundos

const urlSchema = z.object({
  url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
});

/**
 * Executa fetch com timeout via AbortController.
 */
async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handlePost(req, res) {
  const validation = urlSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'URL inválida',
      message: 'URL do YouTube é obrigatória e deve ser válida.',
    });
  }

  const { url } = validation.data;

  // Utiliza a API oEmbed pública do YouTube
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const response = await fetchWithTimeout(oembedUrl);

  if (!response.ok) throw new Error('Não foi possível encontrar o vídeo. Verifique se o link é válido e público.');

  const data = await response.json();

  await req.adminUtils.logActivity('FETCH YOUTUBE', null, `Buscou dados do vídeo: ${data.title}`);
  return res.status(200).json({ title: data.title || '' });
}

export default createAdminHandler({
  name: 'YouTube',
  allowedMethods: ['POST'],
  handlers: { POST: handlePost },
});
