import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/admin/fetch-spotify.js';
import * as auth from '../../../../../lib/auth/auth.js';
import { logger } from '../../../../../lib/infra/logger.js';

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
});
