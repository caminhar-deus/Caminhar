import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks do banco
jest.mock('../../../../lib/db.js', () => ({
  query: jest.fn(),
}));

// Mocks de autenticação
jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import handler from '../../../../pages/api/admin/audit.js';
import { query } from '../../../../lib/db.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth.js';

describe('API Admin - Auditoria (/api/admin/audit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, username: 'admin_user', role: 'admin' });

    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Auditoria'] }] };
      }
      return { rows: [] };
    });
  });

  describe('Autenticação e Permissões', () => {
    it('deve retornar 401 se não houver token', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 403 se o usuário não for admin e não tiver permissão', async () => {
      verifyToken.mockReturnValue({ userId: 2, username: 'user', role: 'editor' });
      query.mockImplementationOnce(async () => ({ rows: [{ permissions: ['Posts/Artigos'] }] }));

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe('GET - Listar Auditoria', () => {
    it('deve retornar 200 e a lista de logs paginada', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: ['Auditoria'] }] };
        if (sql.includes('SELECT COUNT(*)')) return { rows: [{ count: '1' }] };
        if (sql.includes('SELECT * FROM activity_logs')) return { rows: [{ id: 1, username: 'admin_user', action: 'LOGIN' }] };
        return { rows: [] };
      });

      const { req, res } = createMocks({ method: 'GET', query: { page: '1', limit: '10' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // Valida o mapeamento user_id: r.username
      expect(data.data).toEqual([{ id: 1, username: 'admin_user', action: 'LOGIN', user_id: 'admin_user' }]);
      expect(data.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it('deve filtrar logs por data inicial e final', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: ['Auditoria'] }] };
        if (sql.includes('SELECT COUNT(*)')) return { rows: [{ count: '0' }] };
        if (sql.includes('SELECT * FROM activity_logs')) return { rows: [] };
        return { rows: [] };
      });

      const { req, res } = createMocks({ 
        method: 'GET', 
        query: { startDate: '2026-01-01', endDate: '2026-12-31' } 
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      // Garante que os parâmetros startDate e endDate ($1, $2) foram passados para as querys
      expect(query).toHaveBeenCalledWith(expect.stringContaining('created_at >='), expect.arrayContaining(['2026-01-01', '2026-12-31', 50, 0]));
    });

    it('deve interceptar erro 42P01, criar a tabela de auditoria se não existir e retornar 200', async () => {
      let countCall = 0;
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: ['Auditoria'] }] };
        if (sql.includes('SELECT COUNT(*)')) {
          if (countCall === 0) {
            countCall++;
            const error = new Error('relation does not exist');
            error.code = '42P01';
            throw error;
          }
        }
        return { rows: [] };
      });

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS activity_logs'));
    });

    it('deve retornar 500 em caso de erro inesperado no banco de dados', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: ['Auditoria'] }] };
        throw new Error('Falha crítica no DB');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('Tratamento de Erros e Rotas', () => {
    it('deve retornar 405 para métodos não implementados (POST, PUT, DELETE)', async () => {
      const { req, res } = createMocks({ method: 'POST' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });
});