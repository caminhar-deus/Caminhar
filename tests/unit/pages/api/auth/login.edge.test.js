import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
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
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it('deve retornar 500 se ocorrer um erro interno durante a autenticação', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'testuser', password: 'testpass' }
    });

    cache.checkRateLimit.mockResolvedValueOnce(false);
    auth.authenticate.mockRejectedValueOnce(new Error('Erro Forçado no Banco de Dados'));

    await handler(req, res);

    expect(console.error).toHaveBeenCalledWith('Login error:', expect.any(Error));
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ message: 'Erro interno do servidor' });
  });
});
