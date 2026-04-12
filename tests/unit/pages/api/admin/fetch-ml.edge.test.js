import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import handler from '../../../../../pages/api/admin/fetch-ml.js';
import * as auth from '../../../../../lib/auth.js';

jest.mock('../../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn()
}));

describe('API Admin - Fetch ML (Edge Cases)', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();
  let consoleErrorSpy;

  beforeEach(() => {
    global.fetch = mockFetch;
    jest.clearAllMocks();
    auth.getAuthToken.mockReturnValue('fake-token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    consoleErrorSpy.mockRestore();
  });

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn();
    res.end = jest.fn();
    return res;
  };

  it('deve testar a ordenação do array com b === explicitId (linha 35)', async () => {
    const req = {
      method: 'POST',
      // A URL contém dois IDs. O explícito é o segundo, ativando b === explicitId na ordenação
      body: { url: 'https://produto.mercadolivre.com.br/MLB-1111-produto?outro=MLB2222&item_id=MLB2222' }
    };
    const res = mockRes();

    // Simula falha em tudo para percorrer os IDs na ordem programada
    mockFetch.mockResolvedValue({ ok: false });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('MLB2222'));
  });

  it('deve testar retorno de produto de catálogo com descRes.ok = false (linhas 50-52)', async () => {
    const req = {
      method: 'POST',
      body: { url: 'https://produto.mercadolivre.com.br/MLB-3333' }
    };
    const res = mockRes();

    mockFetch.mockImplementation(async (url) => {
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

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Produto 3333',
      description: ''
    }));
  });

  it('deve testar fallback HTML com content antes da property e isNaN(price) (linhas 71-72, 98)', async () => {
    const req = {
      method: 'POST',
      body: { url: 'https://produto.mercadolivre.com.br/MLB-4444' }
    };
    const res = mockRes();

    mockFetch.mockImplementation(async (url) => {
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

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Título no Fallback',
      price: 0,
      images: 'Imagem.jpg',
      description: 'Descrição do Fallback'
    }));
  });

  it('deve testar fallback HTML com priceMatch presente e extrair título da tag <title>', async () => {
    const req = {
      method: 'POST',
      body: { url: 'https://produto.mercadolivre.com.br/MLB-6666' }
    };
    const res = mockRes();

    mockFetch.mockImplementation(async (url) => {
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
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Produto Teste',
      price: 99.9,
      images: '',
      description: ''
    }));
  });

  it('deve testar retorno de item padrão sem price e fallback de imagens (url em vez de secure_url)', async () => {
    const req = { method: 'POST', body: { url: 'https://produto.mercadolivre.com.br/MLB-7777' } };
    const res = mockRes();

    mockFetch.mockImplementation(async (url) => {
      if (url.includes('items/MLB7777/description')) return { ok: true, json: async () => ({ plain_text: 'Desc' }) };
      if (url.includes('items/MLB7777')) return { ok: true, json: async () => ({ title: 'Item', pictures: [{ url: 'http://pic.jpg' }] }) };
      return { ok: false };
    });

    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ price: 0, images: 'http://pic.jpg' }));
  });

  it('deve estourar catch do fallback de scraping quando htmlRes.text falhar (linha 118, 120)', async () => {
    const req = { method: 'POST', body: { url: 'https://produto.mercadolivre.com.br/MLB-5555' } };
    const res = mockRes();

    mockFetch.mockImplementation(async (url) => {
      if (url.includes('api.mercadolibre.com')) return { ok: false };
      if (url.includes('MLB-5555')) return { ok: true, text: async () => { throw new Error('Erro forçado'); } };
      return { ok: false };
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Anúncio inativo ou link inválido (Nenhum produto/item encontrado).'
    }));
    expect(consoleErrorSpy).toHaveBeenCalledWith('Falha no fallback de scraping HTML:', expect.any(Error));
  });
});