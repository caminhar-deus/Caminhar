import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/admin/cache.js';
import { clearAllCache } from '../../../../lib/cache.js';

jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../../../../lib/cache.js', () => ({
  clearAllCache: jest.fn()
}));

import { getAuthToken, verifyToken } from '../../../../lib/auth.js';

describe('API Admin - Cache (/api/admin/cache)', () => {
  const originalConsoleError = console.error;

  beforeAll(() => { console.error = () => {}; });
  afterAll(() => { console.error = originalConsoleError; });
  beforeEach(() => { jest.clearAllMocks(); });

  it('deve retornar 405 para métodos GET/PUT', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 401 sem token', async () => {
    getAuthToken.mockReturnValueOnce(null);
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('deve retornar 403 se o usuário não for admin', async () => {
    getAuthToken.mockReturnValueOnce('token');
    verifyToken.mockReturnValueOnce({ role: 'user' });
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  it('deve limpar o cache com POST ou DELETE e retornar 200', async () => {
    getAuthToken.mockReturnValue('token');
    verifyToken.mockReturnValue({ role: 'admin' });
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(clearAllCache).toHaveBeenCalled();
  });

  it('deve retornar 500 se o clearAllCache lançar erro', async () => {
    getAuthToken.mockReturnValue('token');
    verifyToken.mockReturnValue({ role: 'admin' });
    clearAllCache.mockRejectedValueOnce(new Error('Redis Error'));
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
  });
});
