import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/admin/fetch-spotify.js';
import * as auth from '../../../../../lib/auth/auth.js';
import { logger } from '../../../../../lib/infra/logger.js';
import { logActivity } from '../../../../../lib/domain/audit.js';

jest.mock('../../../../../lib/auth/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
  withAuth: jest.fn((handler) => (req, res) => handler(req, res)),
}));
import { mockGlobalFetch } from '../../../../helpers/index.js';

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

// Auditoria com falha simulada: `req.adminUtils.logActivity` (injetado pelo
// `createAdminHandler` real) rejeita, forçando o catch externo inesperado.
jest.mock('../../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn().mockRejectedValue(new Error('falha na auditoria')),
}));

describe('API - Admin - Fetch Spotify (Edge Cases)', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('deve registrar erro no console quando as 3 estratégias de fetch falharem e retornar 500', async () => {
    auth.getAuthToken.mockReturnValue('valid_token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });
    
    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://open.spotify.com/track/123456789' },
      user: { role: 'admin' },
    });

    // Força todas as chamadas de rede a rejeitarem simultaneamente
    global.fetch.mockRejectedValue(new Error('Erro Forçado de Rede'));

    await handler(req, res);

    // Verifica se todos os tratamentos de erro internos (catch blocks) foram acionados
    expect(logger.error).toHaveBeenCalledWith('FetchSpotify', 'Falha na API oEmbed:', expect.any(Error));
    expect(logger.error).toHaveBeenCalledWith('FetchSpotify', 'Falha na leitura do Iframe:', expect.any(Error));
    expect(logger.error).toHaveBeenCalledWith('FetchSpotify', 'Falha no HTML principal:', expect.any(Error));
    
    // Verifica se a API lidou corretamente retornando o erro de fallback final (status 500)
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Não foi possível identificar a música. Verifique se o link é válido.' });
  });

  it('deve devolver mensagem genérica (nunca error.message cru) quando o erro é inesperado', async () => {
    auth.getAuthToken.mockReturnValue('valid_token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });

    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://open.spotify.com/track/123456789' },
      user: { role: 'admin' },
    });

    // Estratégia 1 recupera o título, mas a auditoria (injetada pelo
    // `createAdminHandler` real via `req.adminUtils`) falha: caminho
    // inesperado do catch externo (antes expunha o message cru).
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Musica Teste' }) });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({
      error: 'Erro interno no servidor',
      message: 'Erro interno ao processar a solicitação.',
    });
    // O detalhe cru continua registrado no log do servidor
    expect(logger.error).toHaveBeenCalledWith(
      'FetchSpotify',
      'Erro interno inesperado ao buscar dados da música:',
      expect.any(Error),
    );
  });

  it('deve rejeitar URL que embute spotify.com/track/ em domínio arbitrário ou loopback (anti-SSRF)', async () => {
    auth.getAuthToken.mockReturnValue('valid_token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });

    const maliciousUrls = [
      'http://127.0.0.1:8080/spotify.com/track/123456789',
      'https://169.254.169.254/latest/meta-data/spotify.com/track/123456789',
      'https://evil.example.com/https://open.spotify.com/track/123456789',
    ];

    for (const url of maliciousUrls) {
      const { req, res } = createMocks({
        method: 'POST',
        body: { url },
        socket: { remoteAddress: '203.0.113.103' },
      });
      req.user = { role: 'admin' };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    }

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('deve usar sempre a URL canônica https://open.spotify.com/track/<id> na Estratégia 3', async () => {
    auth.getAuthToken.mockReturnValue('valid_token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });
    logActivity.mockResolvedValueOnce(true);

    global.fetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><head><meta property="og:description" content="Padre Fábio · Song · 2025" /></head></html>',
      });

    const { req, res } = createMocks({
      method: 'POST',
      body: { url: 'https://open.spotify.com/intl-pt/track/4cOdK2wGLETKBW3PvgPWqT?si=tracking123' },
      socket: { remoteAddress: '203.0.113.104' },
    });
    req.user = { role: 'admin' };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData().artist).toBe('Padre Fábio');
    expect(global.fetch.mock.calls[2][0]).toBe('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
  });
});
