import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../lib/auth.js', () => ({
  withAuth: jest.fn((handler) => async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    return handler(req, res);
  }),
}));

jest.mock('../../../lib/db.js', () => ({
  query: jest.fn(),
}));

import handler from '../../../pages/api/cleanup-test-data.js';
import { query } from '../../../lib/db.js';

describe('API - Cleanup Test Data (/api/cleanup-test-data)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getMocks = (method = 'DELETE', user = null) => {
    const { req, res } = createMocks({ method });
    if (user) req.user = user;
    return { req, res };
  };

  it('deve retornar 405 se método não for DELETE', async () => {
    const { req, res } = getMocks('GET', { username: 'admin' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 403 se o usuário não for o admin', async () => {
    const { req, res } = getMocks('DELETE', { username: 'user_comum' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  it('deve executar o delete no banco e retornar 200 se for admin fixo ("admin")', async () => {
    query.mockResolvedValueOnce({ rowCount: 2 });
    const { req, res } = getMocks('DELETE', { username: 'admin' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
  });

  it('deve retornar 500 se o banco falhar', async () => {
    query.mockRejectedValueOnce(new Error('DB Failed'));
    const { req, res } = getMocks('DELETE', { username: 'admin' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
  });
});