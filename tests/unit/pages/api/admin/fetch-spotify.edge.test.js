import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import handler from '../../../../../pages/api/admin/fetch-spotify.js';
import * as auth from '../../../../../lib/auth.js';

jest.mock('../../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn()
}));
import { mockGlobalFetch } from '../../../../helpers/index.js';

describe('API - Admin - Fetch Spotify (Edge Cases)', () => {
  let req;
  let res;
  let consoleErrorSpy;
  let fetchMock;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock = mockGlobalFetch();
    req = { 
      method: 'POST',
      body: { url: 'https://open.spotify.com/track/123456789' }
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  it('deve registrar erro no console quando as 3 estratégias de fetch falharem e retornar 500', async () => {
    auth.getAuthToken.mockReturnValue('valid_token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });
    
    // Força todas as chamadas de rede a rejeitarem simultaneamente
    global.fetch.mockRejectedValue(new Error('Erro Forçado de Rede'));

    await handler(req, res);

    // Verifica se todos os tratamentos de erro internos (catch blocks) foram acionados
    expect(console.error).toHaveBeenCalledWith('Falha na API oEmbed:', expect.any(Error));
    expect(console.error).toHaveBeenCalledWith('Falha na leitura do Iframe:', expect.any(Error));
    expect(console.error).toHaveBeenCalledWith('Falha no HTML principal:', expect.any(Error));
    
    // Verifica se a API lidou corretamente retornando o erro de fallback final (status 500)
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível identificar a música. Verifique se o link é válido.' });
  });
});