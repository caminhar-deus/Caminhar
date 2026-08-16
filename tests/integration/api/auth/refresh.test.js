import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/auth/refresh.js';

jest.mock('../../../../lib/auth/auth', () => ({
  refreshAccessToken: jest.fn(),
  setAuthCookie: jest.fn(),
  setRefreshTokenCookie: jest.fn(),
  getRefreshTokenCookie: jest.fn(),
}));

jest.mock('../../../../lib/infra/logger', () => {
  const mockMethods = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  };
  return { ...mockMethods, logger: { ...mockMethods } };
});

import * as auth from '../../../../lib/auth/auth';
import { logger } from '../../../../lib/infra/logger';

describe('API Auth - Refresh (/api/auth/refresh)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 405 para métodos diferentes de POST', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 401 quando não houver refresh token no cookie nem no body', async () => {
    auth.getRefreshTokenCookie.mockReturnValue(null);
    const { req, res } = createMocks({ method: 'POST', body: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('deve renovar o token e retornar 200 quando o refresh token for válido (via cookie)', async () => {
    auth.getRefreshTokenCookie.mockReturnValue('refresh-do-cookie');
    auth.refreshAccessToken.mockResolvedValueOnce({
      accessToken: 'novo-access-token',
      refreshToken: 'novo-refresh-token',
      user: { id: 1, username: 'admin' },
    });

    const { req, res } = createMocks({ method: 'POST', body: {} });
    await handler(req, res);

    expect(auth.refreshAccessToken).toHaveBeenCalledWith('refresh-do-cookie');
    expect(auth.setAuthCookie).toHaveBeenCalledWith(res, 'novo-access-token');
    expect(auth.setRefreshTokenCookie).toHaveBeenCalledWith(res, 'novo-refresh-token');
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).data.token).toBe('novo-access-token');
  });

  it('deve usar o refresh token do body quando o cookie não estiver disponível', async () => {
    auth.getRefreshTokenCookie.mockReturnValue(null);
    auth.refreshAccessToken.mockResolvedValueOnce({ accessToken: 't', refreshToken: 'r', user: {} });

    const { req, res } = createMocks({ method: 'POST', body: { refreshToken: 'refresh-do-body' } });
    await handler(req, res);

    expect(auth.refreshAccessToken).toHaveBeenCalledWith('refresh-do-body');
    expect(res._getStatusCode()).toBe(200);
  });

  it('deve retornar 401 e limpar os cookies quando o refresh token for inválido', async () => {
    auth.getRefreshTokenCookie.mockReturnValue('refresh-invalido');
    auth.refreshAccessToken.mockResolvedValueOnce({ error: 'INVALID_REFRESH_TOKEN', message: 'Sessão expirada' });

    const { req, res } = createMocks({ method: 'POST', body: {} });
    await handler(req, res);

    expect(auth.setAuthCookie).toHaveBeenCalledWith(res, '', { maxAge: 0 });
    expect(auth.setRefreshTokenCookie).toHaveBeenCalledWith(res, '', { maxAge: 0 });
    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData()).error).toBe('INVALID_REFRESH_TOKEN');
  });

  it('deve retornar 500 e registrar erro quando refreshAccessToken lançar exceção', async () => {
    auth.getRefreshTokenCookie.mockReturnValue('refresh-x');
    auth.refreshAccessToken.mockRejectedValueOnce(new Error('falha interna'));

    const { req, res } = createMocks({ method: 'POST', body: {} });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(logger.error).toHaveBeenCalledWith('Auth', 'Erro ao renovar token:', expect.any(Error));
  });
});