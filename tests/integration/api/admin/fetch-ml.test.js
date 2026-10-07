import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../../lib/auth/auth.js', () => {
  const mockGetAuthToken = jest.fn();
  const mockVerifyToken = jest.fn();
  return {
    getAuthToken: mockGetAuthToken,
    verifyToken: mockVerifyToken,
    withAuth: jest.fn((handler) => (req, res) => {
      const token = mockGetAuthToken(req);
      if (!token) {
        return res.status(401).json({ message: 'Não autenticado' });
      }
      const decoded = mockVerifyToken(token);
      if (!decoded) {
        return res.status(401).json({ message: 'Token inválido' });
      }
      req.user = decoded;
      return handler(req, res);
    }),
  };
});

// Mock do DB para controlar a query de roles do RBAC (createAdminHandler)
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());

import handler from '../../../../pages/api/admin/fetch-ml.js';
import { query } from '../../../../lib/infra/db.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth/auth.js';
import { mockGlobalFetch } from '../../../helpers/index.js';

describe('API Admin - Fetch Mercado Livre (/api/admin/fetch-ml)', () => {
  let fetchMock;

  beforeEach(() => {
    jest.clearAllMocks();
    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, role: 'admin' });

    // createAdminHandler consulta roles.permissions (RBAC) antes do handler:
    // devolve a permissão exigida pelo recurso para o caminho padrão ser de
    // PERMISSÃO CONCEDIDA (admin ignora, não-admin é autorizado).
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Gestão de Produtos'] }] };
      }
      return { rows: [], rowCount: 0 };
    });

    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  describe('Segurança e Autorização', () => {
    it('deve retornar 403 se o usuário não for admin e não tiver permissão', async () => {
      // O catch do adminCrudHandler também devolve 403 quando a query de roles
      // FALHA (fail-closed) — por isso este teste vem em par com o "allow"
      // logo abaixo: só o par prova que a negação aqui é por FALTA DE PERMISSÃO
      // e não por mock de banco no caminho errado.
      query.mockResolvedValueOnce({ rows: [{ permissions: ['Dashboard'] }] });
      verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });

      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://site.com/link?MLB111&item_id=MLB999' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      // `error` é igual nos dois caminhos de 403 (falta de permissão ×
      // fail-closed por falha de banco): só o `message` exigindo a permissão discrimina.
      const body = JSON.parse(res._getData());
      expect(body.error).toContain('Acesso negado');
      expect(body.message).toContain('Requer permissão');
      // O RBAC roda ANTES do handler: o deny não deve nem chegar no fetch
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('não deve retornar 403 se o usuário não-admin tiver a permissão exigida', async () => {
      // Companheiro do teste acima: mesmo cargo 'comum', mas COM 'Gestão de Produtos'.
      // Se o mock do banco estiver errado (query falhando/undefined), o fail-closed
      // devolveria 403 aqui e o teste quebraria — é isso que o par garante.
      query.mockResolvedValueOnce({ rows: [{ permissions: ['Gestão de Produtos'] }] });
      verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });

      global.fetch.mockImplementation(async (url) => {
        if (url.includes('/items/MLB999/description')) {
          return { ok: true, json: async () => ({ plain_text: 'Descrição' }) };
        }
        if (url.includes('/items/MLB999')) {
          return { ok: true, json: async () => ({ title: 'Produto', price: 99.9, pictures: [{ url: 'img.jpg' }] }) };
        }
        return { ok: false };
      });

      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://site.com/link?MLB111&item_id=MLB999' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).title).toBe('Produto');
    });
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