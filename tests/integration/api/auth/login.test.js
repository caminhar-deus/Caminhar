import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/auth/login';
import * as auth from '../../../../lib/auth/auth';
import { checkRateLimit } from '../../../../lib/cache/cache';
import { logger } from '../../../../lib/infra/logger';

jest.mock('../../../../lib/auth/auth', () => ({
  authenticate: jest.fn(),
  generateToken: jest.fn(),
  setAuthCookie: jest.fn(),
  setRefreshTokenCookie: jest.fn(),
  authenticateAndGenerateToken: jest.fn()
}));

// Neutraliza o rate limit nesta suíte por padrão; cenários dedicados abaixo
// habilitam retorno true por chamada para testar bloqueio por IP e por usuário.
jest.mock('../../../../lib/cache/cache', () => ({
  checkRateLimit: jest.fn(() => Promise.resolve(false))
}));

jest.mock('../../../../lib/infra/logger', () => {
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
    // mockClear não descarta respostas enfileiradas com mockResolvedValueOnce:
    // sem o reset, o `true` do teste de 429 vaza para o teste seguinte.
    checkRateLimit.mockReset();
    checkRateLimit.mockResolvedValue(false);
  });

  it('deve retornar 405 para métodos não permitidos (ex: GET)', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeader('Allow')).toEqual(['POST']);
  });

  it('deve bloquear com 429 via rate limit por IP antes de consultar autenticação', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'a', password: 'b' } });
    req.socket = { remoteAddress: '198.51.100.10' };
    checkRateLimit.mockResolvedValueOnce(true);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith('198.51.100.10', 'api:auth:login', 5, 60000);
    expect(logger.warn).toHaveBeenCalledWith('Auth', 'Rate limit de login excedido | IP: 198.51.100.10');
    expect(auth.authenticateAndGenerateToken).not.toHaveBeenCalled();
  });

  it('deve retornar 429 se authenticateAndGenerateToken sinalizar RATE_LIMITED com IP desconhecido', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'a', password: 'b' } });
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      error: 'RATE_LIMITED',
      message: 'Muitas tentativas de login. Aguarde um minuto e tente novamente.'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(429);
    expect(res._getJSONData()).toEqual({
      error: 'Too Many Requests',
      message: 'Muitas tentativas de login. Aguarde um minuto e tente novamente.'
    });
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

  it('deve aplicar backstop por usuário normalizado (trim + lowercase) ao atingir limite de falhas', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { username: '  Admin  ', password: 'errada' }
    });
    req.socket = { remoteAddress: '198.51.100.20' };
    // 1ª chamada: IP (false); 2ª chamada: usuário (true)
    checkRateLimit.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      error: 'INVALID_CREDENTIALS',
      message: 'Credenciais inválidas'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(429);
    expect(checkRateLimit).toHaveBeenNthCalledWith(2, 'admin', 'api:auth:login:username', 10, 300000);
    expect(logger.warn).toHaveBeenCalledWith(
      'Auth',
      expect.stringContaining('Rate limit por usuário excedido')
    );
  });

  it('deve registrar aviso quando X-Forwarded-For divergir do socket sem TRUST_PROXY sem bloquear login', async () => {
    const prevTrustProxy = process.env.TRUST_PROXY;
    delete process.env.TRUST_PROXY;
    try {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.9' },
        body: { username: 'admin', password: '123' }
      });
      req.socket = { remoteAddress: '127.0.0.1' };
      auth.authenticateAndGenerateToken.mockResolvedValueOnce({
        user: { id: 1, username: 'admin', role: 'admin', permissions: ['Visão Geral'] },
        token: 'fake-jwt-token',
        refreshToken: 'fake-refresh-token',
        permissionsLoaded: true,
        error: null
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(logger.warn).toHaveBeenCalledWith(
        'Auth',
        expect.stringContaining('X-Forwarded-For divergente do socket sem TRUST_PROXY')
      );
      expect(checkRateLimit).toHaveBeenCalledWith('127.0.0.1', 'api:auth:login', 5, 60000);
    } finally {
      if (prevTrustProxy !== undefined) {
        process.env.TRUST_PROXY = prevTrustProxy;
      }
    }
  });

  it('deve retornar 200, definir os cookies e autorizar credenciais válidas', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'admin', password: '123' } });
    checkRateLimit.mockResolvedValueOnce(false);
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      user: { id: 1, username: 'admin', role: 'admin', permissions: ['Visão Geral'] },
      token: 'fake-jwt-token',
      refreshToken: 'fake-refresh-token',
      permissionsLoaded: true,
      error: null
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(auth.setAuthCookie).toHaveBeenCalledWith(res, 'fake-jwt-token');
    expect(auth.setRefreshTokenCookie).toHaveBeenCalledWith(res, 'fake-refresh-token');
    const data = JSON.parse(res._getData());
    expect(data.user.username).toBe('admin');
  });

  it('deve suportar ?response=body retornando token no corpo sem expor refreshToken nem definir cookies', async () => {
    const { req: reqComRefresh, res: resComRefresh } = createMocks({
      method: 'POST',
      query: { response: 'body' },
      body: { username: 'admin', password: '123' }
    });
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      user: { id: 1, username: 'admin', role: 'admin', permissions: ['Visão Geral'] },
      token: 'body-jwt-token',
      refreshToken: 'secret-refresh-token',
      permissionsLoaded: true,
      error: null
    });

    await handler(reqComRefresh, resComRefresh);

    expect(resComRefresh._getStatusCode()).toBe(200);
    expect(auth.setAuthCookie).not.toHaveBeenCalled();
    expect(auth.setRefreshTokenCookie).not.toHaveBeenCalled();
    const payload1 = resComRefresh._getJSONData();
    expect(payload1.success).toBe(true);
    expect(payload1.data.token).toBe('body-jwt-token');
    expect(payload1.data.token_type).toBe('Bearer');
    expect(payload1.data.expires_in).toBe(3600);
    expect(payload1.data.refresh_token_stored).toBe(true);
    expect(payload1.data.refreshToken).toBeUndefined();
    expect(payload1.data.refresh_token).toBeUndefined();
    expect(payload1.data.user).toEqual({
      userId: 1,
      username: 'admin',
      role: 'admin',
      permissions: ['Visão Geral'],
      permissionsLoaded: true
    });

    const { req: reqSemRefresh, res: resSemRefresh } = createMocks({
      method: 'POST',
      query: { response: 'body' },
      body: { username: 'admin', password: '123' }
    });
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      user: { id: 1, username: 'admin', role: 'admin', permissions: [] },
      token: 'body-jwt-token-2',
      refreshToken: null,
      permissionsLoaded: false,
      error: null
    });

    await handler(reqSemRefresh, resSemRefresh);

    expect(resSemRefresh._getStatusCode()).toBe(200);
    expect(resSemRefresh._getJSONData().data.refresh_token_stored).toBe(false);
    expect(resSemRefresh._getJSONData().data.user.permissionsLoaded).toBe(false);
  });
});
