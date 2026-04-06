import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import handler from '../../../../pages/api/admin/fetch-spotify.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth.js';

describe('API Admin - Fetch Spotify (/api/admin/fetch-spotify)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, role: 'admin' });
    // Define um fallback padrão para evitar que chamadas subsequentes (Estratégias 2 e 3) retornem undefined
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
  });

  afterEach(() => {
    global.fetch = originalFetch;
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