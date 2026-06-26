import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/auth/login';
import * as auth from '../../../../lib/auth';
import { checkRateLimit } from '../../../../lib/cache';

jest.mock('../../../../lib/auth', () => ({
  authenticate: jest.fn(),
  generateToken: jest.fn(),
  setAuthCookie: jest.fn(),
  authenticateAndGenerateToken: jest.fn()
}));

jest.mock('../../../../lib/cache', () => ({
  checkRateLimit: jest.fn()
}));

jest.mock('../../../../lib/logger', () => {
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

describe('Integração: API de Login (/api/auth/login)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 405 para métodos não permitidos (ex: GET)', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 429 se o IP estourar o limite de tentativas (Rate Limit)', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'a', password: 'b' } });
    checkRateLimit.mockResolvedValueOnce(true);
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      error: 'RATE_LIMITED',
      message: 'Muitas tentativas de login. Aguarde um minuto e tente novamente.'
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
  });

  it('deve retornar 401 para credenciais inválidas', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'errado', password: '123' } });
    checkRateLimit.mockResolvedValueOnce(false);
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      error: 'INVALID_CREDENTIALS',
      message: 'Credenciais inválidas'
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('deve retornar 200, definir os cookies e autorizar credenciais válidas', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'admin', password: '123' } });
    checkRateLimit.mockResolvedValueOnce(false);
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      user: { id: 1, username: 'admin', role: 'admin', permissions: ['Visão Geral'] },
      token: 'fake-jwt-token',
      error: null
    });

    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(auth.setAuthCookie).toHaveBeenCalledWith(res, 'fake-jwt-token');
    const data = JSON.parse(res._getData());
    expect(data.user.username).toBe('admin');
  });
});
