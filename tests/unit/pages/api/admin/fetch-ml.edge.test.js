import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/admin/fetch-ml.js';
import * as auth from '../../../../../lib/auth/auth.js';
import { mockGlobalFetch } from '../../../../helpers/index.js';
import { logger } from '../../../../../lib/infra/logger.js';

jest.mock('../../../../../lib/auth/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
  withAuth: jest.fn((handler) => (req, res) => {
    req.user = req.user || { role: 'admin' };
    return handler(req, res);
  }),
}));

jest.mock('../../../../../lib/infra/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
  // O adminCrudHandler usa o contexto assíncrono para correlação de logs
  runWithRequestId: (id, fn) => fn(),
  setRequestId: jest.fn(),
}));

describe('API Admin - Fetch ML (Edge Cases)', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    auth.getAuthToken.mockReturnValue('fake-token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });
    // A API do Mercado Livre só é consultada quando existe token OAuth
    // (desde abr/2025 ela exige Authorization em /items e /products).
    process.env.ML_ACCESS_TOKEN = 'test-token';
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    delete process.env.ML_ACCESS_TOKEN;
  });

  it('deve testar a ordenação do array com b === explicitId (linha 35)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      // A URL contém dois IDs. O explícito é o segundo, ativando b === explicitId na ordenação
      body: { url: 'https://produto.mercadolivre.com.br/MLB-1111-produto?outro=MLB2222&item_id=MLB2222' }
    });

    // Simula falha em tudo para percorrer os IDs na ordem programada
    global.fetch.mockResolvedValue({ ok: false });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(502);
    // O fetch deve ter chamado MLB2222 (item_id explícito) primeiro, depois MLB1111
    expect(global.fetch.mock.calls[0][0]).toContain('MLB2222');
  });

  it('deve testar retorno de produto de catálogo com descRes.ok = false (linhas 50-52)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://produto.mercadolivre.com.br/MLB-3333' }
    });

    global.fetch.mockImplementation(async (url) => {
      if (url.includes('items/MLB3333/description')) return { ok: false };
      if (url.includes('items/MLB3333')) return { ok: false };
      if (url.includes('products/MLB3333')) {
        return {
          ok: true,
          json: async () => ({
            name: 'Produto 3333',
            buy_box_winner: { item_id: 'MLB3333REAL', price: 150 },
            pictures: [{ url: 'pic.jpg' }]
          })
        };
      }
      if (url.includes('MLB3333REAL/description')) {
        return { ok: false }; // Falha intencional na descrição secundária
      }
      return { ok: false };
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(expect.objectContaining({
      title: 'Produto 3333',
      description: ''
    }));
  });

  it('deve testar fallback HTML com content antes da property e isNaN(price) (linhas 71-72, 98)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://produto.mercadolivre.com.br/MLB-4444' }
    });

    global.fetch.mockImplementation(async (url) => {
      if (url.includes('api.mercadolibre.com')) return { ok: false };
      if (url.includes('MLB-4444')) {
        return {
          ok: true,
          text: async () => `
            <html>
              <head>
                <meta content="Título no Fallback - R$ TextoInvalido" property="og:title">
                <meta content="Imagem.jpg" property="og:image">
                <meta content="Descrição do Fallback" property="og:description">
              </head>
            </html>
          `
        };
      }
      return { ok: false };
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(expect.objectContaining({
      title: 'Título no Fallback',
      price: null,
      images: 'Imagem.jpg',
      description: 'Descrição do Fallback'
    }));
  });

  it('deve testar fallback HTML com priceMatch presente e extrair título da tag <title>', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://produto.mercadolivre.com.br/MLB-6666' }
    });

    global.fetch.mockImplementation(async (url) => {
      if (url.includes('api.mercadolibre.com')) return { ok: false };
      if (url.includes('MLB-6666')) {
        return {
          ok: true,
          text: async () => `
            <html>
              <head>
                <title>Produto Teste | MercadoLivre</title>
                <meta property="product:price:amount" content="99.90">
              </head>
            </html>
          `
        };
      }
      return { ok: false };
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(expect.objectContaining({
      title: 'Produto Teste',
      price: 99.9,
      images: '',
      description: ''
    }));
  });

  it('deve testar retorno de item padrão sem price e fallback de imagens (url em vez de secure_url)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://produto.mercadolivre.com.br/MLB-7777' }
    });

    global.fetch.mockImplementation(async (url) => {
      if (url.includes('items/MLB7777/description')) return { ok: true, json: async () => ({ plain_text: 'Desc' }) };
      if (url.includes('items/MLB7777')) return { ok: true, json: async () => ({ title: 'Item', pictures: [{ url: 'http://pic.jpg' }] }) };
      return { ok: false };
    });

    await handler(req, res);
    // Preço ausente na resposta da API vira null (não 0)
    expect(res._getJSONData()).toEqual(expect.objectContaining({ price: null, images: 'http://pic.jpg' }));
  });

  it('deve estourar catch do fallback de scraping quando htmlRes.text falhar (linha 118, 120)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://produto.mercadolivre.com.br/MLB-5555' }
    });

    global.fetch.mockImplementation(async (url) => {
      if (url.includes('api.mercadolibre.com')) return { ok: false };
      if (url.includes('MLB-5555')) return { ok: true, text: async () => { throw new Error('Erro forçado'); } };
      return { ok: false };
    });

    await handler(req, res);

    // 502: link válido, leitura da loja falhou (antes era 500 com a mensagem
    // falsa de "anúncio inativo")
    expect(res._getStatusCode()).toBe(502);
    expect(res._getJSONData()).toEqual(expect.objectContaining({
      error: 'Não foi possível ler os dados deste link no Mercado Livre. Preencha nome, preço e imagem manualmente.'
    }));
    expect(logger.error).toHaveBeenCalledWith('FetchML', 'Falha no fallback de scraping HTML:', expect.any(Error));
  });

  it('deve devolver mensagem genérica (nunca error.message cru) quando o erro é inesperado', async () => {
    // `decodeURIComponent` com '%' malformado lança URIError: caminho
    // inesperado no catch externo da rota (antes expunha o message cru).
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://produto.mercadolivre.com.br/MLB-9999%ZZ' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({
      error: 'Erro interno no servidor',
      message: 'Erro interno ao processar a solicitação.',
    });
    // O detalhe cru continua registrado no log do servidor
    expect(logger.error).toHaveBeenCalledWith(
      'FetchML',
      'Erro interno inesperado ao buscar dados do produto:',
      expect.any(Error),
    );
  });

  it('deve detectar link da Amazon e extrair dados das meta tags (multi-loja)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://www.amazon.com.br/dp/B0ABC123?tag=afiliado' }
    });

    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => `
        <html><head>
          <meta property="og:title" content="Produto Amazon : Amazon.com.br">
          <meta property="og:image" content="https://img.amazon/a.jpg">
          <meta property="og:description" content="Descrição Amazon">
          <meta property="product:price:amount" content="149.90">
        </head></html>
      `
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(expect.objectContaining({
      title: 'Produto Amazon',
      price: 149.9,
      images: 'https://img.amazon/a.jpg',
      description: 'Descrição Amazon'
    }));
  });

  it('deve detectar link da Shopee e limpar o sufixo do título', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://shopee.com.br/product/123/456' }
    });

    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => `
        <html><head>
          <meta property="og:title" content="Terço de São Miguel | Shopee Brasil">
          <meta property="og:image" content="https://img.shopee/t.jpg">
          <meta property="product:price:amount" content="29,90">
        </head></html>
      `
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(expect.objectContaining({
      title: 'Terço de São Miguel',
      price: 29.9,
      images: 'https://img.shopee/t.jpg'
    }));
  });

  it('deve recusar link de loja não suportada com 400', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://www.lojaqualquer.com.br/produto/1' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual(expect.objectContaining({ error: 'Loja não suportada' }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('deve importar o link real da vitrine (/up/MLBU… com wid no fragmento) pelo preview', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        // Link real do bug (29/10/2026): o wid vem DEPOIS do "#", não na query
        url: 'https://www.mercadolivre.com.br/crucifixo-de-mesa-parede-madeira-com-metal-sao-bento-25cm/up/MLBU1104166422#polycard_client=search-desktop&wid=MLB2134743881&sid=search'
      }
    });

    global.fetch.mockImplementation(async (url) => {
      // API sem credencial válida: 403/401 na vida real
      if (url.includes('api.mercadolibre.com')) return { ok: false };
      return {
        ok: true,
        url: 'https://www.mercadolivre.com.br/crucifixo-de-mesa-parede-madeira-com-metal-sao-bento-25cm/up/MLBU1104166422',
        text: async () => `
          <html><head>
            <meta property="og:title" content="Crucifixo De Mesa Parede Madeira Com Metal São Bento 25cm" />
            <meta property="og:image" content="https://http2.mlstatic.com/D_NQ_NP_741439-MLA104575435325_012026-OO.png" />
            <meta property="og:description" content="Lindo crucifixo de mesa com pé removível." />
          </head></html>
        `
      };
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.title).toBe('Crucifixo De Mesa Parede Madeira Com Metal São Bento 25cm');
    expect(data.images).toContain('http2.mlstatic.com');
    expect(data.description).toContain('crucifixo de mesa');
    // O preview não expõe preço: null (nunca 0) — o operador digita
    expect(data.price).toBeNull();
    // O `wid` do fragmento foi reconhecido como código do anúncio
    expect(global.fetch.mock.calls.some(([u]) => String(u).includes('/items/MLB2134743881'))).toBe(true);
  });

  it('deve avisar sobre bloqueio anti-bot (422) em vez de dizer que o anúncio está inativo', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://www.mercadolivre.com.br/produto/up/MLBU1104166422' }
    });

    global.fetch.mockImplementation(async (url) => {
      if (url.includes('api.mercadolibre.com')) return { ok: false };
      return {
        ok: true,
        // O ML redireciona para o muro de verificação quando desconfia do cliente
        url: 'https://www.mercadolivre.com.br/gz/account-verification?go=https%3A%2F%2Fwww.mercadolivre.com.br',
        text: async () => '<html><head><link href="https://http2.mlstatic.com/frontend-assets/suspicious-traffic-frontend/gz.css" /></head></html>'
      };
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(422);
    expect(res._getJSONData().error).toContain('bloqueou a leitura automática');
  });

  it('não deve chamar a API do Mercado Livre quando não há token OAuth', async () => {
    delete process.env.ML_ACCESS_TOKEN;

    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://produto.mercadolivre.com.br/MLB-1234-produto' }
    });

    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => '<meta property="og:title" content="Produto Preview" />'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(global.fetch.mock.calls.every(([u]) => !String(u).includes('api.mercadolibre.com'))).toBe(true);
  });

  it('deve aceitar link que só tem MLBU (sem wid) e resolver pelo preview', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://www.mercadolivre.com.br/algum-produto/up/MLBU1104166422' }
    });

    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => '<meta property="og:title" content="Produto UP" />'
    });

    await handler(req, res);

    // Antes devolvia 400 "Nenhum código de produto (MLB) encontrado no link."
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData().title).toBe('Produto UP');
  });
});
