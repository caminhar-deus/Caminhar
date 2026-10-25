import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { z } from 'zod';
import { logger } from '../../../lib/infra/logger.js';
import { isSpotifyTrackUrl } from '../../../lib/media/spotify.js';

const FETCH_TIMEOUT = 8000; // 8 segundos

const urlSchema = z.object({
  url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
});

/**
 * Mensagem genérica de 500, igual à do `lib/api/adminCrudHandler.js`
 * (`GENERIC_ERROR_MESSAGE`): `error.message` cru nunca chega ao cliente.
 * O texto é literal local porque o módulo não exporta a constante.
 */
const GENERIC_ERROR_MESSAGE = 'Erro interno ao processar a solicitação.';

/**
 * Erro de negócio: mensagem amigável e intencional (ex.: link inválido),
 * devolvida ao operador como está. Qualquer outro erro do `catch` vira
 * mensagem genérica — nunca `error.message` cru.
 */
class BusinessError extends Error {}

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
      message: 'URL do Spotify é obrigatória e deve ser válida.',
    });
  }

  const { url } = validation.data;

  if (!isSpotifyTrackUrl(url)) {
    throw new BusinessError('Apenas links de faixa (track) do Spotify são suportados para pré-visualização/embeb.');
  }

  try {
    let title = '';
    let artist = '';

    // Estratégia 1: API oEmbed Oficial do Spotify (Sempre retorna o título com 100% de precisão)
    try {
      const oembedRes = await fetchWithTimeout(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || '';
      }
    } catch (e) {
      logger.error('FetchSpotify', 'Falha na API oEmbed:', e);
    }

    // Estratégia 2: Extrair do código-fonte do Iframe de Embed (Forma mais estável para obter o Artista)
    const trackMatch = url.match(/(?:track|episode)\/([a-zA-Z0-9]+)/);
    if (trackMatch) {
      try {
        const embedRes = await fetchWithTimeout(`https://open.spotify.com/embed/track/${trackMatch[1]}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        if (embedRes.ok) {
          const embedHtml = await embedRes.text();
          // O HTML do Embed possui scripts internos com os dados exatos da música em JSON
          const artistsMatch = embedHtml.match(/"artists"\s*:\s*\[\s*{\s*"name"\s*:\s*"([^"]+)"/i) ||
                               embedHtml.match(/"artists":\[\{"name":"([^&]+)"/i);

          if (artistsMatch && artistsMatch[1]) {
            artist = artistsMatch[1];
          }

          if (!title) {
            const titleMatch = embedHtml.match(/"name"\s*:\s*"([^"]+)"/i);
            if (titleMatch) title = titleMatch[1];
          }
        }
      } catch (e) {
        logger.error('FetchSpotify', 'Falha na leitura do Iframe:', e);
      }
    }

    // Estratégia 3: Scraping das Tags Meta (SEO). O uso do "Googlebot" força o Spotify a entregar os dados
    if (!artist) {
      try {
        const htmlRes = await fetchWithTimeout(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });

        if (htmlRes.ok) {
          const html = await htmlRes.text();

          // Tenta pegar o artista pela Meta Description (Ex: "Queen · Song · 1975")
          const descMatch = html.match(/<meta\s+(?:property|name)="(?:og:)?description"\s+content="([^"]+)"/i);

          if (descMatch && descMatch[1]) {
            const descContent = descMatch[1].replace(/"/g, '"').replace(/&#39;/g, "'").replace(/&/g, '&');
            const parts = descContent.split('·');
            if (parts.length > 1) {
              artist = parts[0].trim();
            }
          }
        }
      } catch (e) {
        logger.error('FetchSpotify', 'Falha no HTML principal:', e);
      }
    }

    if (!title && !artist) {
      throw new BusinessError('Não foi possível identificar a música. Verifique se o link é válido.');
    }

    await req.adminUtils.logActivity('FETCH SPOTIFY', null, `Buscou dados da música: ${title}`);
    // Retorna com Fallback
    return res.status(200).json({ title, artist: artist || 'Artista não identificado' });
  } catch (error) {
    // Erro de negócio: mensagem amigável, devolvida como está (sem log de erro).
    if (error instanceof BusinessError) {
      return res.status(500).json({ error: error.message });
    }
    // Erro inesperado: o detalhe cru fica só no log do servidor; o cliente
    // recebe a mensagem genérica (padrão do `adminCrudHandler.js`).
    logger.error('FetchSpotify', 'Erro interno inesperado ao buscar dados da música:', error);
    return res.status(500).json({ error: 'Erro interno no servidor', message: GENERIC_ERROR_MESSAGE });
  }
}

export default createAdminHandler({
  name: 'Spotify',
  permission: 'Gestão de Músicas',
  allowedMethods: ['POST'],
  handlers: { POST: handlePost },
});