import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks para as operações de banco
jest.mock('../../../../lib/db.js', () => ({
  query: jest.fn(),
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
  logActivity: jest.fn(),
}));

// Mocks de autenticação
jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import handler from '../../../../pages/api/admin/roles.js';
import { query, createRecord, updateRecords, deleteRecords, logActivity } from '../../../../lib/db.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth.js';

describe('API Admin - Gestão de Cargos (/api/admin/roles)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Usuário padrão autenticado (Admin tem acesso liberado)
    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, username: 'admin_user', role: 'admin' });

    // Interceptador padrão de queries para não quebrar a validação de permissões e o GET
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Segurança', 'Usuários'] }] };
      }
      if (sql.includes('SELECT * FROM roles')) {
        return { rows: [{ id: 1, name: 'admin' }] };
      }
      if (sql.includes('SELECT name FROM roles')) {
        return { rows: [{ name: 'editor' }] };
      }
      return { rows: [] };
    });
  });

  describe('Autenticação e Permissões', () => {
    it('deve retornar 401 se o token não for enviado', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 403 se o usuário não for admin e não tiver permissões corretas', async () => {
      verifyToken.mockReturnValue({ userId: 2, username: 'user', role: 'comum' });
      
      // Sobrescreve a query de permissão simulando um cargo sem privilégios de Segurança
      query.mockImplementationOnce(async () => ({ rows: [{ permissions: ['Posts/Artigos'] }] }));

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe('GET - Listar Cargos', () => {
    it('deve retornar 200 e a lista de cargos', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toEqual([{ id: 1, name: 'admin' }]);
    });

    it('deve interceptar erro 42P01 (Tabela inexistente), criar a tabela, semear dados e retornar 200', async () => {
      let getCallCount = 0;
      
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: [] }] };
        
        if (sql.includes('SELECT * FROM roles')) {
          if (getCallCount === 0) {
            getCallCount++;
            const error = new Error('relation "roles" does not exist');
            error.code = '42P01';
            throw error;
          }
          return { rows: [{ id: 1, name: 'admin', permissions: '[]' }] };
        }
        return { rows: [] };
      });

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      // Garante que o comando de CREATE TABLE foi disparado durante o setup
      expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE roles'));
      expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO roles'));
    });

    it('deve retornar 500 se o banco falhar com erro inesperado (diferente de 42P01)', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: [] }] };
        throw new Error('Falha geral no DB');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      consoleSpy.mockRestore();
    });
  });

  describe('POST - Criar Cargo', () => {
    it('deve criar um cargo novo, logar a ação e retornar 201', async () => {
      createRecord.mockResolvedValueOnce({ id: 5, name: 'Moderador' });

      const { req, res } = createMocks({ 
        method: 'POST', 
        body: { name: 'Moderador', permissions: ['Visão Geral'] } 
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(createRecord).toHaveBeenCalledWith('roles', { name: 'Moderador', permissions: '["Visão Geral"]' });
      expect(logActivity).toHaveBeenCalledWith('admin_user', 'CRIAR CARGO', 'ROLE', 5, expect.any(String), expect.any(String));
    });
  });

  describe('PUT - Atualizar Cargo', () => {
    it('deve atualizar o cargo, processando permissões, e retornar 200', async () => {
      updateRecords.mockResolvedValueOnce([{ id: 1, name: 'Super Admin' }]);

      const { req, res } = createMocks({ 
        method: 'PUT', 
        body: { id: 1, name: 'Super Admin', permissions: ['Segurança'] } 
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(updateRecords).toHaveBeenCalledWith('roles', { name: 'Super Admin', permissions: '["Segurança"]' }, { id: 1 });
    });
  });

  describe('DELETE - Excluir Cargo', () => {
    it('deve remover o cargo e gravar a auditoria com o nome correto', async () => {
      const { req, res } = createMocks({ method: 'DELETE', query: { id: '3' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(deleteRecords).toHaveBeenCalledWith('roles', { id: 3 });
      expect(logActivity).toHaveBeenCalledWith(expect.any(String), 'EXCLUIR CARGO', 'ROLE', 3, 'Removeu o cargo: editor', expect.any(String));
    });
  });

  describe('Tratamento de Erros e Rotas', () => {
    it('deve retornar 405 para métodos não implementados', async () => {
      const { req, res } = createMocks({ method: 'PATCH' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });
});