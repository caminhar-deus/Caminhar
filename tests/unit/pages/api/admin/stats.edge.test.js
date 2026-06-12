import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/admin/stats.js';
import * as auth from '../../../../../lib/auth.js';
import * as db from '../../../../../lib/db.js';

jest.mock('../../../../../lib/auth.js', () => {
  const mockModule = {
    getAuthToken: jest.fn(),
    verifyToken: jest.fn(),
    withAuth: jest.fn((handler) => async (req, res) => {
      const token = mockModule.getAuthToken();
      if (!token) {
        return res.status(401).json({ error: 'Não autenticado', message: 'Token ausente' });
      }
      const user = mockModule.verifyToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Token inválido', message: 'Token ausente ou inválido' });
      }
      req.user = user;
      return handler(req, res);
    }),
  };
  return mockModule;
});

jest.mock('../../../../../lib/db.js', () => require('../../../../mocks/db-module').mockDb());

describe('API - Admin - Stats (Edge Cases)', () => {
  let req;
  let res;

  beforeEach(() => {
    const mocks = createMocks({ method: 'GET' });
    req = mocks.req;
    res = mocks.res;
    // Garante autenticação padrão para todos os testes
    auth.getAuthToken.mockReturnValue('valid_token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });
  });

  it('deve bloquear métodos diferentes de GET (405)', async () => {
    req.method = 'POST';
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Método não permitido');
  });

  it('deve retornar 500 em caso de erro no banco de dados', async () => {
    // query.mockImplementation foi setado no setup, precisa sobrescrever completamente
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    db.query.mockReset();
    db.query.mockRejectedValue(new Error('Erro Forçado no DB'));

    await handler(req, res);

    expect(consoleSpy).toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Erro interno no servidor', message: 'Erro Forçado no DB' });
    
    consoleSpy.mockRestore();
  });
});
