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

import handler from '../../../../pages/api/admin/fetch-spotify.js';
import { query } from '../../../../lib/infra/db.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth/auth.js';
import { mockGlobalFetch } from '../../../helpers/index.js';

describe('API Admin - Fetch Spotify (/api/admin/fetch-spotify)', () => {
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
        return { rows: [{ permissions: ['Gestão de Músicas'] }] };
      }
      return { rows: [], rowCount: 0 };
    });

    // Define um fallback padrão para evitar que chamadas subsequentes (Estratégias 2 e 3) retornem undefined
    fetchMock = mockGlobalFetch();
    fetchMock.mockResolvedValue({ ok: false });
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  describe('Segurança e Validações', () => {
    it('deve retornar 405 se não for POST', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });

    it('deve retornar 401 sem token ou token inválido', async () => {
      getAuthToken.mockReturnValue(null);
      let { req, res } = createMocks({ method: 'POST', body: { url: 'http://spotify.com' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 400 sem URL no body', async () => {
      const { req, res } = createMocks({ method: 'POST', body: {} });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 403 se o usuário não for admin e não tiver permissão', async () => {
      // O catch do adminCrudHandler também devolve 403 quando a query de roles
      // FALHA (fail-closed) — por isso este teste vem em par com o "allow"
      // logo abaixo: só o par prova que a negação aqui é por FALTA DE PERMISSÃO
      // e não por mock de banco no caminho errado.
      query.mockResolvedValueOnce({ rows: [{ permissions: ['Dashboard'] }] });
      verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });

      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://open.spotify.com/track/123' } });
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
      // Companheiro do teste acima: mesmo cargo 'comum', mas COM 'Gestão de Músicas'.
      // Se o mock do banco estiver errado (query falhando/undefined), o fail-closed
      // devolveria 403 aqui e o teste quebraria — é isso que o par garante.
      query.mockResolvedValueOnce({ rows: [{ permissions: ['Gestão de Músicas'] }] });
      verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Musica Teste' }) });

      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://open.spotify.com/track/123' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).title).toBe('Musica Teste');
    });
  });

  describe('Extração de Dados', () => {
    it('Estratégia 1: deve retornar dados via oEmbed API', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Musica Teste' }) });
      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://open.spotify.com/track/123' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).title).toBe('Musica Teste');
    });

    it('Estratégia 2: deve extrair artista e título via Iframe (Regex)', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false }); // Falha 1
      global.fetch.mockResolvedValueOnce({ ok: true, text: async () => `<html><body><script>{"name":"Musica Iframe", "artists":[{"name":"Artista Iframe"}]}</script></body></html>` });
      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://open.spotify.com/track/456' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).artist).toBe('Artista Iframe');
    });

    it('Estratégia 3: deve extrair dados via Meta Tags SEO (Googlebot Fallback)', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false }); // Falha 1
      global.fetch.mockResolvedValueOnce({ ok: false }); // Falha 2
      global.fetch.mockResolvedValueOnce({ ok: true, text: async () => `<html><head><meta property="og:description" content="Artista Meta · Song · 2026" /></head></html>` });
      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://open.spotify.com/track/789' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).artist).toBe('Artista Meta');
    });

    it('deve retornar 500 caso todas as estratégias falhem', async () => {
      global.fetch.mockResolvedValue({ ok: false });
      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://open.spotify.com/track/invalid' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
    });
  });
});