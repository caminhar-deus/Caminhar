import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import handler from '../../../../../pages/api/admin/stats.js';
import * as auth from '../../../../../lib/auth.js';
import * as db from '../../../../../lib/db.js';

jest.mock('../../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn()
}));

jest.mock('../../../../../lib/db.js', () => ({
  query: jest.fn()
}));

describe('API - Admin - Stats (Edge Cases)', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { method: 'GET' };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };
  });

  it('deve bloquear métodos diferentes de GET (405)', async () => {
    req.method = 'POST';
    await handler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith('Method POST Not Allowed');
  });

  it('deve retornar 500 em caso de erro no banco de dados', async () => {
    auth.getAuthToken.mockReturnValue('valid_token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });
    
    db.query.mockRejectedValueOnce(new Error('Erro Forçado no DB'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await handler(req, res);

    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno no servidor' });
    
    consoleSpy.mockRestore();
  });
});