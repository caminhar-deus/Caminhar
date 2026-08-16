import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../lib/auth/auth.js', () => ({
  withAuth: jest.fn((handler) => async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    return handler(req, res);
  }),
}));

jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());

import handler from '../../../pages/api/cleanup-test-data.js';
import { query } from '../../../lib/infra/db.js';

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
    // Suprime o console.error do logger disfarado como erro esperado do caminho
    // de falha simulada, para não poluir a saída/estatística de logs em testes.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      query.mockRejectedValueOnce(new Error('DB Failed'));
      const { req, res } = getMocks('DELETE', { username: 'admin' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      // Garante que somente o erro esperado foi logado (não mascara outros).
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('DB Failed'));
    } finally {
      errorSpy.mockRestore();
    }
  });
});