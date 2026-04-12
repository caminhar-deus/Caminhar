import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import handler from '../../../../../pages/api/admin/roles.js';
import * as auth from '../../../../../lib/auth.js';
import * as db from '../../../../../lib/db.js';

jest.mock('../../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn()
}));

jest.mock('../../../../../lib/db.js', () => ({
  query: jest.fn(),
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
  logActivity: jest.fn()
}));

describe('API - Admin - Roles (Edge Cases)', () => {
  let req;
  let res;
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      method: 'GET',
      headers: {},
      socket: {}, // Força o fallback de IP para 'unknown'
      body: {},
      query: {}
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };
  });

  it('deve usar IP unknown e fallback para permissões vazias se o cargo não existir (linhas 6 e 21)', async () => {
    auth.getAuthToken.mockReturnValue('token');
    auth.verifyToken.mockReturnValue({ role: 'misterious_role' });
    db.query.mockResolvedValueOnce({ rows: [] }); // Cargo misterioso não traz linhas

    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve processar POST com permissões enviadas nativamente como string (linha 56)', async () => {
    auth.getAuthToken.mockReturnValue('token');
    auth.verifyToken.mockReturnValue({ role: 'admin', username: 'admin' });
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] });
    
    req.method = 'POST';
    req.body = { name: 'Visitante', permissions: '["Leitura"]' };
    db.createRecord.mockResolvedValueOnce({ id: 9, name: 'Visitante' });

    await handler(req, res);
    
    expect(db.createRecord).toHaveBeenCalledWith('roles', expect.objectContaining({ permissions: '["Leitura"]' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('deve processar PUT extraindo ID da query, sem permissões e com fallback no retorno (linhas 61 a 66)', async () => {
    auth.getAuthToken.mockReturnValue('token');
    auth.verifyToken.mockReturnValue({ role: 'admin', username: 'admin' });
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] });
    
    req.method = 'PUT';
    req.query = { id: '99' };
    req.body = { name: 'Novo Nome', permissions: '["String"]' }; // Permissão já em string anula o Array.isArray()
    
    db.updateRecords.mockResolvedValueOnce([]); // Retorna array vazio para forçar o || {}

    await handler(req, res);
    
    expect(db.updateRecords).toHaveBeenCalledWith('roles', expect.objectContaining({ name: 'Novo Nome' }), { id: 99 });
    expect(res.json).toHaveBeenCalledWith({});
  });

  it('deve processar DELETE extraindo ID da query e lidando com fallback do nome no log (linhas 68-72)', async () => {
    auth.getAuthToken.mockReturnValue('token');
    auth.verifyToken.mockReturnValue({ role: 'admin', username: 'admin' });
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] });
    
    req.method = 'DELETE';
    req.query = { id: '55' };
    db.query.mockResolvedValueOnce({ rows: [] }); // Não achou o nome do cargo, usa o ID

    await handler(req, res);
    expect(db.logActivity).toHaveBeenCalledWith('admin', 'EXCLUIR CARGO', 'ROLE', 55, 'Removeu o cargo: 55', 'unknown');
  });
});