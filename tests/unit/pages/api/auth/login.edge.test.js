import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import handler from '../../../../../pages/api/auth/login.js';
import * as auth from '../../../../../lib/auth.js';
import * as cache from '../../../../../lib/cache.js';

jest.mock('../../../../../lib/auth.js', () => ({
  authenticate: jest.fn(),
  generateToken: jest.fn(),
  setAuthCookie: jest.fn()
}));

jest.mock('../../../../../lib/cache.js', () => ({
  checkRateLimit: jest.fn()
}));

describe('API - Auth - Login (Edge Cases)', () => {
  let req;
  let res;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    req = {
      method: 'POST',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      body: { username: 'testuser', password: 'testpass' }
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it('deve retornar 500 se ocorrer um erro interno durante a autenticação', async () => {
    cache.checkRateLimit.mockResolvedValueOnce(false);
    auth.authenticate.mockRejectedValueOnce(new Error('Erro Forçado no Banco de Dados'));

    await handler(req, res);

    expect(console.error).toHaveBeenCalledWith('Login error:', expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno do servidor' });
  });
});