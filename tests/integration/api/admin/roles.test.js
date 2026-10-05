import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks para as operações de banco
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());

// Mocks para CRUD (createRecord, updateRecords, deleteRecords)
jest.mock('../../../../lib/crud/crud.js', () => ({
  createRecord: jest.fn(),
  updateRecords: jest.fn(),
  deleteRecords: jest.fn(),
}));

// Mocks para auditoria (logActivity)
jest.mock('../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn(),
}));

// Mocks de autenticação
jest.mock('../../../../lib/auth/auth.js', () => {
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

import handler from '../../../../pages/api/admin/roles.js';
import { query } from '../../../../lib/infra/db.js';
import { createRecord, updateRecords, deleteRecords } from '../../../../lib/crud/crud.js';
import { logActivity } from '../../../../lib/domain/audit.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth/auth.js';
import { logger } from '../../../../lib/infra/logger.js';
import { mockRolePermissions } from '../../../helpers/roles.js';

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

    it('deve retornar 403 para não-admin com permissions TEXT (string JSON) sem as permissões exigidas', async () => {
      verifyToken.mockReturnValue({ userId: 2, username: 'user', role: 'comum' });

      // O banco devolve a coluna TEXT como STRING JSON, não como array
      query.mockImplementationOnce(async () => ({
        rows: [{ permissions: mockRolePermissions(['Visão Geral']) }],
      }));

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });

    it('deve retornar 403 quando a permissão exigida só aparece como substring do texto JSON (regressão de match de substring)', async () => {
      verifyToken.mockReturnValue({ userId: 2, username: 'user', role: 'comum' });

      // 'Usuários' aparece apenas como substring de outro valor — não é a permissão.
      // Antes da normalização, `'["Auditoria de Usuários"]'.includes('Usuários')` era true.
      query.mockImplementationOnce(async () => ({
        rows: [{ permissions: mockRolePermissions(['Auditoria de Usuários']) }],
      }));

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });

    it('deve negar 403 e registrar logger.error quando a consulta de permissões FALHA (fail-closed)', async () => {
      // Diferente dos casos acima (usuário SEM a permissão), aqui o banco falha:
      // a negação precisa de telemetria para ser distinguível no log.
      verifyToken.mockReturnValue({ userId: 2, username: 'user', role: 'comum' });

      const dbError = new Error('relation "roles" does not exist');
      query.mockImplementationOnce(async () => {
        throw dbError;
      });

      const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData()).message).toContain('Não foi possível verificar permissões');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'AdminCrudHandler',
        expect.stringContaining('handler Role'),
        dbError,
      );
      expect(loggerErrorSpy.mock.calls[0][1]).toContain('role "comum"');

      loggerErrorSpy.mockRestore();
    });
  });

  describe('GET - Listar Cargos', () => {
    it('deve retornar 200 e a lista de cargos', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      // Row sem `permissions` no mock agora chega com `permissions: []` normalizado
      expect(data.data).toEqual([{ id: 1, name: 'admin', permissions: [] }]);
    });

    it('deve devolver permissions como array normalizado (coluna TEXT do banco)', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) {
          return { rows: [{ permissions: mockRolePermissions(['Segurança', 'Usuários']) }] };
        }
        if (sql.includes('SELECT * FROM roles')) {
          return {
            rows: [
              { id: 2, name: 'editor', permissions: mockRolePermissions(['Posts/Artigos']) },
              { id: 3, name: 'visitante' },
            ],
          };
        }
        return { rows: [] };
      });

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data[0]).toEqual({ id: 2, name: 'editor', permissions: ['Posts/Artigos'] });
      expect(Array.isArray(data.data[0].permissions)).toBe(true);
      // Row sem o campo também sai com array (fail-closed), preservando os demais campos
      expect(data.data[1]).toEqual({ id: 3, name: 'visitante', permissions: [] });
    });

    it('deve responder 500 com mensagem acionável quando a tabela roles não existe (42P01), sem executar DDL/DML', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: [] }] };

        if (sql.includes('SELECT * FROM roles')) {
          const error = new Error('relation "roles" does not exist');
          error.code = '42P01';
          throw error;
        }
        return { rows: [] };
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = res._getJSONData();
      expect(data.error).toBe('Erro interno no servidor');
      expect(data.message).toContain('npm run migrate');

      // Schema é responsabilidade das migrações: NENHUM DDL/DML no path de request
      expect(query).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE roles'), expect.anything());
      expect(query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO roles'), expect.anything());
      // Forma com um único argumento (query(sql) sem params) — cobre o CREATE TABLE antigo
      expect(query).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE roles'));

      consoleSpy.mockRestore();
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
      // `createRecord` usa RETURNING * sobre a coluna TEXT: a row CHEGA com
      // `permissions` como STRING JSON — é isso que a resposta precisa normalizar.
      createRecord.mockResolvedValueOnce({
        id: 5,
        name: 'Moderador',
        permissions: mockRolePermissions(['Visão Geral']),
      });

      const { req, res } = createMocks({ 
        method: 'POST', 
        body: { name: 'Moderador', permissions: ['Visão Geral'] } 
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(createRecord).toHaveBeenCalledWith('roles', { name: 'Moderador', permissions: '["Visão Geral"]' });
      expect(logActivity).toHaveBeenCalledWith('admin_user', 'CRIAR CARGO', 'ROLE', 5, expect.any(String), expect.any(String));

      // POST responde no MESMO formato do GET: `permissions` como array.
      // O mock devolve string — se a normalização fosse removida, o array
      // abaixo falharia (a resposta traria a string crua).
      const data = res._getJSONData();
      expect(Array.isArray(data.permissions)).toBe(true);
      expect(data.permissions).toEqual(['Visão Geral']);
      // Demais campos da row preservados
      expect(data.id).toBe(5);
      expect(data.name).toBe('Moderador');
    });
  });

  describe('PUT - Atualizar Cargo', () => {
    it('deve atualizar o cargo, processando permissões, e retornar 200', async () => {
      // RETURNING * sobre a coluna TEXT: row chega com `permissions` string
      updateRecords.mockResolvedValueOnce([
        { id: 1, name: 'Super Admin', permissions: mockRolePermissions(['Segurança']) },
      ]);

      const { req, res } = createMocks({ 
        method: 'PUT', 
        body: { id: 1, name: 'Super Admin', permissions: ['Segurança'] } 
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(updateRecords).toHaveBeenCalledWith('roles', { name: 'Super Admin', permissions: '["Segurança"]' }, { id: 1 });

      // PUT responde no MESMO formato do GET: `permissions` como array
      const data = res._getJSONData();
      expect(Array.isArray(data.permissions)).toBe(true);
      expect(data.permissions).toEqual(['Segurança']);
      expect(data.id).toBe(1);
      expect(data.name).toBe('Super Admin');

      // Fallback preservado: sem row atualizada continua respondendo {}
      updateRecords.mockResolvedValueOnce([]);
      const second = createMocks({ method: 'PUT', body: { id: 99 } });
      await handler(second.req, second.res);
      expect(second.res._getStatusCode()).toBe(200);
      expect(second.res._getJSONData()).toEqual({});
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