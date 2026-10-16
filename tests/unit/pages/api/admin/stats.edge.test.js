import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/admin/stats.js';
import * as auth from '../../../../../lib/auth/auth.js';
import * as db from '../../../../../lib/infra/db.js';

jest.mock('../../../../../lib/auth/auth.js', () => {
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

jest.mock('../../../../../lib/infra/db.js', () => require('../../../../mocks/db-module').mockDb());

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
    // A mensagem crua do erro NÃO pode vazar para o cliente: só o texto
    // genérico (o detalhe fica no log acima).
    expect(res._getJSONData()).toEqual({
      error: 'Erro interno no servidor',
      message: 'Erro interno ao processar a solicitação.',
    });

    consoleSpy.mockRestore();
  });

  it('deve retornar 503 + Retry-After quando o banco está indisponível', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    db.query.mockReset();
    // SQLSTATE 53300 = too_many_connections (verificado: o pg expõe o SQLSTATE
    // em `error.code` e `query()` relança o erro original, sem wrap)
    const unavailable = new Error('sorry, too many clients already');
    unavailable.code = '53300';
    db.query.mockRejectedValue(unavailable);

    await handler(req, res);

    expect(consoleSpy).toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(503);
    expect(res.getHeader('Retry-After')).toBe('5');
    expect(res._getJSONData()).toEqual({
      error: 'Serviço temporariamente indisponível',
      message: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
    });

    consoleSpy.mockRestore();
  });
});
