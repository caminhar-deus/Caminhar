import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks de autenticação
jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import handler from '../../../../pages/api/admin/fetch-youtube.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth.js';

describe('API Admin - Fetch YouTube (/api/admin/fetch-youtube)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Simula usuário logado
    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, role: 'admin' });
    
    // Moca a função fetch global do Node.js
    global.fetch = jest.fn();
  });

  afterEach(() => {
    // Restaura o fetch original para não quebrar outros testes
    global.fetch = originalFetch;
  });

  describe('Segurança e Validações', () => {
    it('deve retornar 405 se o método não for POST', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });

    it('deve retornar 401 se não estiver autenticado', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://youtube.com/watch?v=123' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 400 se a URL não for fornecida', async () => {
      const { req, res } = createMocks({ method: 'POST', body: {} });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('Busca de Dados (oEmbed)', () => {
    it('deve retornar 200 e o título do vídeo em caso de sucesso', async () => {
      // Simula a resposta de sucesso da API do Youtube
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'Vídeo Muito Legal' })
      });

      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://youtu.be/12345' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ title: 'Vídeo Muito Legal' });
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('https://www.youtube.com/oembed'));
    });

    it('deve retornar 500 se o fetch falhar (ex: vídeo privado, apagado ou erro de rede)', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false }); // Resposta não-ok

      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://youtu.be/privado' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData()).error).toContain('Não foi possível encontrar o vídeo');
    });
  });
});