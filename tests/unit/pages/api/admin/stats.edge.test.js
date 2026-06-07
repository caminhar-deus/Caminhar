import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/admin/stats.js';
import * as auth from '../../../../../lib/auth.js';
import * as db from '../../../../../lib/db.js';

jest.mock('../../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn()
}));

jest.mock('../../../../../lib/db.js', () => require('../../../../../mocks/db-module').mockDb());

describe('API - Admin - Stats (Edge Cases)', () => {
  let req;
  let res;

  beforeEach(() => {
    const mocks = createMocks({ method: 'GET' });
    req = mocks.req;
    res = mocks.res;
  });

  it('deve bloquear métodos diferentes de GET (405)', async () => {
    req.method = 'POST';
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(res._getData()).toBe('Method POST Not Allowed');
  });

  it('deve retornar 500 em caso de erro no banco de dados', async () => {
    auth.getAuthToken.mockReturnValue('valid_token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });
    
    db.query.mockRejectedValueOnce(new Error('Erro Forçado no DB'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await handler(req, res);

    expect(consoleSpy).toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Erro interno no servidor' });
    
    consoleSpy.mockRestore();
  });
});
