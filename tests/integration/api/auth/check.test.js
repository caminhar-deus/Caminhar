import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/auth/check.js';
import * as auth from '../../../../lib/auth.js';

jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn()
}));

describe('API Auth Check (/api/auth/check)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('deve retornar 405 para métodos diferentes de GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 401 se não houver token', async () => {
    auth.getAuthToken.mockReturnValue(null);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
    const data = res._getJSONData();
    expect(data.error).toBe('Unauthorized');
  });

  it('deve retornar 401 se o token for inválido ou expirado', async () => {
    auth.getAuthToken.mockReturnValue('invalid-token');
    auth.verifyToken.mockReturnValue(null);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
    const data = res._getJSONData();
    expect(data.error).toBe('Unauthorized');
  });

  it('deve retornar 200 com dados do usuário para token válido', async () => {
    const mockUser = { userId: 1, username: 'admin', role: 'admin' };
    auth.getAuthToken.mockReturnValue('valid-token');
    auth.verifyToken.mockReturnValue(mockUser);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.success).toBe(true);
    expect(data.data.authenticated).toBe(true);
    expect(data.data.user.userId).toBe(1);
    expect(data.data.user.username).toBe('admin');
    expect(data.data.user.role).toBe('admin');
  });

  it('deve retornar 500 se houver erro interno', async () => {
    auth.getAuthToken.mockImplementation(() => { throw new Error('Erro interno'); });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    const data = res._getJSONData();
    expect(data.error).toBe('Internal Server Error');
  });
});