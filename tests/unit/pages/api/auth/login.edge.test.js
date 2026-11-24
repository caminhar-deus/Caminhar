import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/auth/login.js';
import * as auth from '../../../../../lib/auth/auth.js';
import * as cacheModule from '../../../../../lib/cache/cache.js';
import * as loggerModule from '../../../../../lib/infra/logger.js';

jest.mock('../../../../../lib/auth/auth.js', () => ({
  authenticate: jest.fn(),
  generateToken: jest.fn(),
  setAuthCookie: jest.fn(),
  setRefreshTokenCookie: jest.fn(),
  authenticateAndGenerateToken: jest.fn()
}));

jest.mock('../../../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn()
}));

jest.mock('../../../../../lib/infra/logger.js', () => {
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
    cacheModule.checkRateLimit.mockResolvedValue(false);
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

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['string', 'texto-invalido'],
    ['campos não-string', { username: ['admin'], password: { raw: '123' } }],
  ])('deve tratar req.body %s sem TypeError e retornar 400 (MISSING_FIELDS)', async (_rotulo, body) => {
    const { req, res } = createMocks({ method: 'POST' });
    req.body = body;
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      error: 'MISSING_FIELDS',
      message: 'Usuário e senha são obrigatórios'
    });

    await handler(req, res);

    expect(auth.authenticateAndGenerateToken).toHaveBeenCalledWith(
      undefined,
      undefined,
      expect.any(String),
      expect.any(Object)
    );
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({
      error: 'Bad Request',
      message: 'Usuário e senha são obrigatórios'
    });
  });

  it('deve retornar 500 para código de erro inesperado com e sem mensagem explícita', async () => {
    auth.authenticateAndGenerateToken
      .mockResolvedValueOnce({ error: 'UNEXPECTED_STATE', message: 'Falha específica' })
      .mockResolvedValueOnce({ error: 'UNEXPECTED_STATE' });

    const first = createMocks({ method: 'POST', body: { username: 'a', password: 'b' } });
    await handler(first.req, first.res);
    expect(first.res._getStatusCode()).toBe(500);
    expect(first.res._getJSONData()).toEqual({
      error: 'Internal Server Error',
      message: 'Falha específica'
    });

    const second = createMocks({ method: 'POST', body: { username: 'a', password: 'b' } });
    await handler(second.req, second.res);
    expect(second.res._getStatusCode()).toBe(500);
    expect(second.res._getJSONData()).toEqual({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor'
    });
  });

  it('deve concluir login com cookie de acesso sem definir refresh cookie quando refreshToken for null', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'admin', password: 'secret' }
    });
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      user: { id: 1, username: 'admin', role: 'admin', permissions: ['Visão Geral'] },
      token: 'jwt-only',
      refreshToken: null,
      permissionsLoaded: true,
      error: null
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(auth.setAuthCookie).toHaveBeenCalledWith(res, 'jwt-only');
    expect(auth.setRefreshTokenCookie).not.toHaveBeenCalled();
  });
});
