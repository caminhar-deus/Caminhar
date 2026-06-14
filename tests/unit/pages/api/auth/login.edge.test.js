import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/auth/login.js';
import * as auth from '../../../../../lib/auth.js';
import * as cache from '../../../../../lib/cache.js';
import * as loggerModule from '../../../../../lib/logger.js';

jest.mock('../../../../../lib/auth.js', () => ({
  authenticate: jest.fn(),
  generateToken: jest.fn(),
  setAuthCookie: jest.fn(),
  authenticateAndGenerateToken: jest.fn()
}));

jest.mock('../../../../../lib/cache.js', () => ({
  checkRateLimit: jest.fn()
}));

jest.mock('../../../../../lib/logger.js', () => {
  const mockMethods = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn()
  };
  return {
    ...mockMethods,
    logger: { ...mockMethods }
  };
});

describe('API - Auth - Login (Edge Cases)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.checkRateLimit.mockResolvedValue(false);
  });

  it('deve retornar 500 se ocorrer um erro interno durante a autenticação', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'testuser', password: 'testpass' }
    });

    auth.authenticateAndGenerateToken.mockRejectedValueOnce(
      new Error('Erro Forçado no Banco de Dados')
    );

    await handler(req, res);

    expect(loggerModule.logger.error).toHaveBeenCalledWith(
      'Auth',
      'Erro interno durante a autenticação:',
      expect.any(Error)
    );
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor'
    });
  });
});