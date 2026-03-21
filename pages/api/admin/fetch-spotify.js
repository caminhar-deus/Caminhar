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
  if (!url) return res.status(400).json({ error: 'URL do Spotify não fornecida.' });

  try {
    let title = '';
    let artist = '';

    // Estratégia 1: API oEmbed Oficial do Spotify (Sempre retorna o título com 100% de precisão)
    try {
      const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || '';
      }
    } catch (e) {
      console.error('Falha na API oEmbed:', e);
    }

    // Estratégia 2: Extrair do código-fonte do Iframe de Embed (Forma mais estável para obter o Artista)
    const trackMatch = url.match(/(?:track|episode)\/([a-zA-Z0-9]+)/);
    if (trackMatch) {
      try {
        const embedRes = await fetch(`https://open.spotify.com/embed/track/${trackMatch[1]}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        if (embedRes.ok) {
          const embedHtml = await embedRes.text();
          // O HTML do Embed possui scripts internos com os dados exatos da música em JSON
          const artistsMatch = embedHtml.match(/"artists"\s*:\s*\[\s*{\s*"name"\s*:\s*"([^"]+)"/i) || 
                               embedHtml.match(/&quot;artists&quot;:\[{&quot;name&quot;:&quot;([^&]+)&quot;/i);
          
          if (artistsMatch && artistsMatch[1]) {
            artist = artistsMatch[1];
          }
          
          if (!title) {
            const titleMatch = embedHtml.match(/"name"\s*:\s*"([^"]+)"/i);
            if (titleMatch) title = titleMatch[1];
          }
        }
      } catch (e) {
        console.error('Falha na leitura do Iframe:', e);
      }
    }

    // Estratégia 3: Scraping das Tags Meta (SEO). O uso do "Googlebot" força o Spotify a entregar os dados
    if (!artist) {
      try {
        const htmlRes = await fetch(url, {
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
            const descContent = descMatch[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
            const parts = descContent.split('·');
            if (parts.length > 1) {
              artist = parts[0].trim();
            }
          }
        }
      } catch (e) {
        console.error('Falha no HTML principal:', e);
      }
    }

    if (!title && !artist) {
      throw new Error('Não foi possível identificar a música. Verifique se o link é válido.');
    }

    // Retorna com Fallback
    return res.status(200).json({ title, artist: artist || 'Artista não identificado' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}