import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import handler from '../../../../pages/api/admin/fetch-ml.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth.js';

describe('API Admin - Fetch Mercado Livre (/api/admin/fetch-ml)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, role: 'admin' });
    
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve retornar 405 se não for POST, 401 sem auth e 400 sem URL ou sem código MLB', async () => {
    // 405 Method Not Allowed
    let { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);

    // 401 Unauthorized
    getAuthToken.mockReturnValue(null);
    ({ req, res } = createMocks({ method: 'POST', body: { url: 'http://ml.com/MLB123' } }));
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
    getAuthToken.mockReturnValue('fake-token'); // restaura

    // 400 Bad Request (sem url)
    ({ req, res } = createMocks({ method: 'POST', body: {} }));
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);

    // 400 Bad Request (sem MLB na URL)
    ({ req, res } = createMocks({ method: 'POST', body: { url: 'http://ml.com/produto-sem-id' } }));
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('deve priorizar a busca pelo "item_id" e consultar a API de items com sucesso', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/items/MLB999/description')) {
        return { ok: true, json: async () => ({ plain_text: 'Descrição do item prioritário' }) };
      }
      if (url.includes('/items/MLB999')) {
        return { ok: true, json: async () => ({ title: 'Produto Prioridade', price: 99.9, pictures: [{ url: 'img.jpg' }] }) };
      }
      return { ok: false };
    });

    const { req, res } = createMocks({ method: 'POST', body: { url: 'https://site.com/link?MLB111&item_id=MLB999' } });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.title).toBe('Produto Prioridade');
    expect(data.price).toBe(99.9);
  });

  it('deve buscar dados via API de products se a API de items falhar', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/items/')) return { ok: false }; // Falha busca de item direto
      if (url.includes('/products/MLB12345')) {
        return { ok: true, json: async () => ({ name: 'Produto Catálogo', buy_box_winner: { price: 150 }, pictures: [{ url: 'cat.jpg' }] }) };
      }
      return { ok: false };
    });

    const { req, res } = createMocks({ method: 'POST', body: { url: 'https://produto.mercadolivre.com.br/p/MLB12345' } });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).title).toBe('Produto Catálogo');
  });

  it('deve usar o fallback de HTML Scraping caso todas as APIs oficiais do ML falhem', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('api.mercadolibre')) return { ok: false }; // Força a falha de todas as APIs
      
      // Simula o código HTML que a rota fará o parse manual com Regex
      return { 
        ok: true, 
        text: async () => `<meta property="og:title" content="Produto Scraped - R$ 2.499,99" /><meta property="og:image" content="scrape.jpg" />` 
      };
    });

    const { req, res } = createMocks({ method: 'POST', body: { url: 'https://produto.mercadolivre.com.br/MLB-88888' } });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.title).toBe('Produto Scraped');
    expect(data.price).toBe(2499.99); // O código substituiu o . por nada e a , por .
  });

  it('deve retornar 500 se nada for encontrado (link inativo)', async () => {
    global.fetch.mockResolvedValue({ ok: false }); // Tudo falha, HTML e APIs
    const { req, res } = createMocks({ method: 'POST', body: { url: 'https://produto.mercadolivre.com.br/MLB-0000' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData()).error).toContain('Anúncio inativo ou link inválido');
  });
});