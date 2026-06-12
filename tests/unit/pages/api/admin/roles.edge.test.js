import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/admin/roles.js';
import * as auth from '../../../../../lib/auth.js';
import * as db from '../../../../../lib/db.js';
import { createRecord, updateRecords } from '../../../../../lib/crud.js';
import { logActivity } from '../../../../../lib/domain/audit.js';

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

jest.mock('../../../../../lib/crud.js', () => ({
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
}));

jest.mock('../../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn(),
}));

describe('API - Admin - Roles (Edge Cases)', () => {
  let req;
  let res;

  beforeEach(() => {
    const mocks = createMocks({
      method: 'GET',
      headers: {},
      socket: {}, // Força o fallback de IP para 'unknown'
      body: {},
      query: {}
    });
    req = mocks.req;
    res = mocks.res;
  });

  it('deve usar IP unknown e fallback para permissões vazias se o cargo não existir (linhas 6 e 21)', async () => {
    auth.getAuthToken.mockReturnValue('token');
    auth.verifyToken.mockReturnValue({ role: 'misterious_role' });
    db.query.mockResolvedValueOnce({ rows: [] }); // Cargo misterioso não traz linhas

    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(403);
  });

  it('deve processar POST com permissões enviadas nativamente como string (linha 56)', async () => {
    auth.getAuthToken.mockReturnValue('token');
    auth.verifyToken.mockReturnValue({ role: 'admin', username: 'admin' });
    db.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: [] }] };
      return { rows: [], rowCount: 0 };
    });
    
    req.method = 'POST';
    req.body = { name: 'Visitante', permissions: ['Leitura'] };
    createRecord.mockResolvedValueOnce({ id: 9, name: 'Visitante' });

    await handler(req, res);
    
    expect(createRecord).toHaveBeenCalledWith('roles', expect.objectContaining({ permissions: '["Leitura"]' }));
    expect(res._getStatusCode()).toBe(201);
  });

  it('deve processar PUT extraindo ID da query, sem permissões e com fallback no retorno (linhas 61 a 66)', async () => {
    auth.getAuthToken.mockReturnValue('token');
    auth.verifyToken.mockReturnValue({ role: 'admin', username: 'admin' });
    db.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: [] }] };
      if (sql.includes('SELECT name FROM roles')) return { rows: [{ name: 'Novo Nome' }] };
      return { rows: [], rowCount: 0 };
    });
    
    req.method = 'PUT';
    req.query = { id: '99' };
    req.body = { id: 99, name: 'Novo Nome', permissions: ['String'] }; // id no body é necessário para o handler
    
    updateRecords.mockResolvedValueOnce([]); // Retorna array vazio para forçar o || {}

    await handler(req, res);
    
    expect(updateRecords).toHaveBeenCalledWith('roles', expect.objectContaining({ name: 'Novo Nome' }), { id: 99 });
    expect(res._getJSONData()).toEqual({});
  });

  it('deve processar DELETE extraindo ID da query e lidando com fallback do nome no log (linhas 68-72)', async () => {
    auth.getAuthToken.mockReturnValue('token');
    auth.verifyToken.mockReturnValue({ role: 'admin', username: 'admin' });
    db.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: [] }] };
      if (sql.includes('SELECT name FROM roles')) return { rows: [] }; // Não achou o nome do cargo
      return { rows: [], rowCount: 0 };
    });
    
    req.method = 'DELETE';
    req.query = { id: '55' };

    await handler(req, res);
    expect(logActivity).toHaveBeenCalledWith('admin', 'EXCLUIR CARGO', 'ROLE', 55, 'Removeu o cargo: 55', expect.any(String));
  });
});
