import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { z } from 'zod';
import { logger } from '../../../lib/infra/logger.js';
import { normalizePrice } from '../../../lib/api/utils.js';

const FETCH_TIMEOUT = 8000; // 8 segundos

const urlSchema = z.object({
  url: z.string().url('URL inválida').min(1, 'URL é obrigatória'),
});

/**
 * Lojas suportadas pelo "Puxar Dados" (decisão D4 do dono, 28/10/2026).
 * O Mercado Livre tem API pública; Amazon e Shopee dependem de leitura do
 * HTML da página (meta tags), que pode falhar por anti-bot — nesse caso o
 * operador preenche os campos manualmente.
 */
const STORES = {
  mercadolivre: {
    hosts: ['mercadolivre.com.br', 'mercadolivre.com', 'mercadolibre.com.br', 'mercadolibre.com'],
    label: 'Mercado Livre',
  },
  amazon: {
    hosts: ['amazon.com.br', 'amazon.br'],
    label: 'Amazon',
  },
  shopee: {
    hosts: ['shopee.com.br', 'shopee.br'],
    label: 'Shopee',
  },
};

/**
 * Mensagem genérica de 500, igual à do `lib/api/adminCrudHandler.js`
 * (`GENERIC_ERROR_MESSAGE`): `error.message` cru nunca chega ao cliente.
 * O texto é literal local porque o módulo não exporta a constante.
 */
const GENERIC_ERROR_MESSAGE = 'Erro interno ao processar a solicitação.';

/**
 * Erro de negócio: mensagem amigável e intencional (ex.: anúncio inativo),
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

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9'
};

/**
 * Detecta a loja a partir da URL. Retorna { key, label, decodedUrl } ou null.
 */
function detectStore(rawUrl) {
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(rawUrl);
  } catch {
    decodedUrl = rawUrl;
  }
  let host;
  try {
    host = new URL(decodedUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  for (const [key, store] of Object.entries(STORES)) {
    if (store.hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      return { key, label: store.label, decodedUrl };
    }
  }

  // Compatibilidade: URL de host desconhecido que carrega um código MLB é
  // tratada como Mercado Livre (o identificador MLB é exclusivo da loja).
  if (/MLB[-_]?\d+/i.test(decodedUrl)) {
    return { key: 'mercadolivre', label: STORES.mercadolivre.label, decodedUrl };
  }

  return null;
}

/**
 * Limpa entidades HTML comuns de títulos/descrições.
 */
function decodeHtmlEntities(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Extração genérica via meta tags Open Graph do HTML da página.
 * Usada pelo fallback do Mercado Livre e como via principal da Amazon e
 * da Shopee (que não oferecem API pública sem credenciais).
 */
async function scrapeFromHtml(url, { titleCleanup } = {}) {
  const htmlRes = await fetchWithTimeout(url, { headers: BROWSER_HEADERS });
  if (!htmlRes.ok) return null;

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

  if (!title) return null;

  title = decodeHtmlEntities(title);
  if (titleCleanup) title = titleCleanup(title);

  let price = normalizePrice(priceMatch) ?? 0;

  return {
    title,
    price,
    images: image ? decodeHtmlEntities(image) : '',
    description: description ? decodeHtmlEntities(description) : '',
  };
}

/**
 * Mercado Livre: API pública de itens/produtos, com fallback de scraping.
 */
async function fetchMercadoLivre(decodedUrl) {
  // Extrai todos os possíveis códigos MLB da URL
  const matches = decodedUrl.match(/MLB[-_]?\d+/gi);
  if (!matches || matches.length === 0) {
    throw new BusinessError('Nenhum código de produto (MLB) encontrado no link.');
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
    const itemRes = await fetchWithTimeout(`https://api.mercadolibre.com/items/${id}`);
    if (itemRes.ok) {
      const itemData = await itemRes.json();
      const descRes = await fetchWithTimeout(`https://api.mercadolibre.com/items/${id}/description`);

      foundData = {
        title: itemData.title,
        price: itemData.price || 0,
        images: itemData.pictures?.map(pic => pic.secure_url || pic.url).join('\n') || '',
        description: descRes.ok ? (await descRes.json()).plain_text : ''
      };
      break; // Sucesso
    }

    // 2. Tenta como um Produto de Catálogo (Product)
    const prodRes = await fetchWithTimeout(`https://api.mercadolibre.com/products/${id}`);
    if (prodRes.ok) {
      const prodData = await prodRes.json();
      const realItemId = prodData.buy_box_winner?.item_id;

      let description = '';
      if (realItemId) {
        const descRes = await fetchWithTimeout(`https://api.mercadolibre.com/items/${realItemId}/description`);
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
      foundData = await scrapeFromHtml(decodedUrl, {
        titleCleanup: (title) => title.replace(/\s*\|\s*MercadoLivre.*/i, '').trim(),
      });

      if (foundData) {
        // Compatibilidade com o formato antigo: "Produto - R$ 89,90" no título
        if (foundData.price === 0 && foundData.title.includes(' - R$')) {
          const parts = foundData.title.split(' - R$');
          foundData.title = parts[0].trim();
          foundData.price = normalizePrice(parts[1]) ?? 0;
        }
      }
    } catch (scrapeErr) {
      logger.error('FetchML', 'Falha no fallback de scraping HTML:', scrapeErr);
    }
  }

  if (!foundData) {
    throw new BusinessError('Anúncio inativo ou link inválido (Nenhum produto/item encontrado).');
  }

  return foundData;
}

/**
 * Amazon e Shopee: leitura do HTML da página (meta tags Open Graph).
 * Podem falhar por anti-bot/region lock — o erro é de negócio com mensagem
 * orientando o preenchimento manual.
 */
async function fetchFromHtmlStore(storeLabel, decodedUrl, titleCleanup) {
  try {
    const foundData = await scrapeFromHtml(decodedUrl, { titleCleanup });
    if (!foundData) {
      throw new BusinessError(
        `Não foi possível ler os dados do produto na ${storeLabel} (a loja pode bloquear a leitura automática). Preencha os campos manualmente.`
      );
    }
    return foundData;
  } catch (error) {
    if (error instanceof BusinessError) throw error;
    logger.error('FetchML', `Falha ao ler HTML da ${storeLabel}:`, error);
    throw new BusinessError(
      `Não foi possível ler os dados do produto na ${storeLabel} (a loja pode bloquear a leitura automática). Preencha os campos manualmente.`
    );
  }
}

async function handlePost(req, res) {
  const validation = urlSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'URL inválida',
      message: 'URL de produto (Amazon, Mercado Livre ou Shopee) é obrigatória e deve ser válida.',
    });
  }

  const { url } = validation.data;
  const store = detectStore(url);

  if (!store) {
    return res.status(400).json({
      error: 'Loja não suportada',
      message: 'Use um link de produto da Amazon, Mercado Livre ou Shopee.',
    });
  }

  try {
    let foundData;
    if (store.key === 'mercadolivre') {
      foundData = await fetchMercadoLivre(store.decodedUrl);
    } else if (store.key === 'amazon') {
      foundData = await fetchFromHtmlStore(store.label, store.decodedUrl, (title) =>
        title.replace(/\s*[:|]\s*Amazon.*$/i, '').trim()
      );
    } else {
      foundData = await fetchFromHtmlStore(store.label, store.decodedUrl, (title) =>
        title.replace(/\s*[|\-–]\s*Shopee.*$/i, '').trim()
      );
    }

    await req.adminUtils.logActivity(`FETCH ${store.label.toUpperCase()}`, null, `Buscou dados do produto: ${foundData.title}`);
    return res.status(200).json(foundData);
  } catch (error) {
    // Erro de negócio: mensagem amigável, devolvida como está (sem log de erro).
    if (error instanceof BusinessError) {
      return res.status(500).json({ error: error.message });
    }
    // Erro inesperado (ex.: `decodeURIComponent` com `%` malformado, falha de
    // `logActivity`): o detalhe cru fica só no log do servidor; o cliente
    // recebe a mensagem genérica (padrão do `adminCrudHandler.js`).
    logger.error('FetchML', 'Erro interno inesperado ao buscar dados do produto:', error);
    return res.status(500).json({ error: 'Erro interno no servidor', message: GENERIC_ERROR_MESSAGE });
  }
}

export default createAdminHandler({
  name: 'PuxarDadosProdutos',
  permission: 'Gestão de Produtos',
  allowedMethods: ['POST'],
  handlers: { POST: handlePost },
});
