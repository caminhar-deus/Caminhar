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
  if (!url) return res.status(400).json({ error: 'URL do Mercado Livre não fornecida.' });

  try {
    // Decodifica a URL para tratar caracteres escondidos (como %3A no lugar de :)
    const decodedUrl = decodeURIComponent(url);
    
    // Extrai todos os possíveis códigos MLB da URL
    const matches = decodedUrl.match(/MLB[-_]?\d+/gi);
    if (!matches || matches.length === 0) {
      return res.status(400).json({ error: 'Nenhum código de produto (MLB) encontrado no link.' });
    }
    
    // Limpa os IDs encontrados e remove duplicatas
    let idsToTry = [...new Set(matches.map(id => id.replace(/[-_]/g, '').toUpperCase()))];

    // Se houver um "item_id" explícito, dá prioridade a ele no início da fila
    const paramMatch = decodedUrl.match(/item_id[:=](MLB[-_]?\d+)/i);
    if (paramMatch) {
      const explicitId = paramMatch[1].replace(/[-_]/g, '').toUpperCase();
      idsToTry.sort((a, b) => a === explicitId ? -1 : b === explicitId ? 1 : 0);
    }

    let foundData = null;

    // Tenta buscar informações na API para cada ID encontrado na URL (Items ou Products)
    for (const id of idsToTry) {
      // 1. Tenta como um Anúncio Padrão (Item)
      const itemRes = await fetch(`https://api.mercadolibre.com/items/${id}`);
      if (itemRes.ok) {
        const itemData = await itemRes.json();
        const descRes = await fetch(`https://api.mercadolibre.com/items/${id}/description`);
        
        foundData = {
          title: itemData.title,
          price: itemData.price || 0,
          images: itemData.pictures?.map(pic => pic.secure_url || pic.url).join('\n') || '',
          description: descRes.ok ? (await descRes.json()).plain_text : ''
        };
        break; // Sucesso
      }
      
      // 2. Tenta como um Produto de Catálogo (Product)
      const prodRes = await fetch(`https://api.mercadolibre.com/products/${id}`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const realItemId = prodData.buy_box_winner?.item_id;
        
        let description = '';
        if (realItemId) {
          const descRes = await fetch(`https://api.mercadolibre.com/items/${realItemId}/description`);
          if (descRes.ok) description = (await descRes.json()).plain_text;
        }

        foundData = {
          title: prodData.name,
          price: prodData.buy_box_winner?.price || 0,
          images: prodData.pictures?.map(pic => pic.url).join('\n') || '',
          description
        };
        break; // Sucesso
      }
    }

    // 3. Fallback de Segurança (Scraping): Se as APIs bloquearem a requisição, lemos o HTML da página!
    if (!foundData) {
      try {
        const htmlRes = await fetch(url, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          }
        });
        
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          
          const getMeta = (prop) => {
            const m = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)="${prop}"[^>]+content="([^"]+)"`, 'i')) ||
                      html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+(?:property|name|itemprop)="${prop}"`, 'i'));
            return m ? m[1] : null;
          };

          let title = getMeta('og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1];
          const image = getMeta('og:image');
          const description = getMeta('og:description') || getMeta('description');
          const priceMatch = getMeta('product:price:amount') || getMeta('price');

          if (title) {
            title = title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
            title = title.replace(/\s*\|\s*MercadoLivre.*/i, '').trim();
            
            let price = 0;
            if (priceMatch) {
              price = parseFloat(priceMatch);
            } else if (title.includes(' - R$')) {
              const parts = title.split(' - R$');
              title = parts[0].trim();
              price = parseFloat(parts[1].trim().replace('.', '').replace(',', '.'));
            }

            foundData = {
              title,
              price: isNaN(price) ? 0 : price,
              images: image || '',
              description: description ? description.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') : ''
            };
          }
        }
      } catch (scrapeErr) {
        console.error('Falha no fallback de scraping HTML:', scrapeErr);
      }
    }

    if (!foundData) {
      throw new Error('Anúncio inativo ou link inválido (Nenhum produto/item encontrado).');
    }

    return res.status(200).json(foundData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}