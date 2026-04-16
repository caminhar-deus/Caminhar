import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks do banco de dados
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
  hashPassword: jest.fn(),
}));

// Mocks do cache (Rate Limit)
jest.mock('../../../../lib/cache.js', () => ({
  checkRateLimit: jest.fn(),
}));

import handler from '../../../../pages/api/admin/users.js';
import { query, createRecord, updateRecords, deleteRecords, logActivity } from '../../../../lib/db.js';
import { getAuthToken, verifyToken, hashPassword } from '../../../../lib/auth.js';
import { checkRateLimit } from '../../../../lib/cache.js';

describe('API Admin - Gestão de Usuários (/api/admin/users)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: Logado como admin, sem rate limit e com bcrypt "simulado"
    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, username: 'admin_user', role: 'admin' });
    checkRateLimit.mockResolvedValue(false);
    hashPassword.mockResolvedValue('hashed_password_123');

    // Fallback padrão para queries
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Usuários', 'Segurança'] }] };
      }
      return { rows: [] };
    });
  });

  describe('Segurança, Autenticação e Rate Limit', () => {
    it('deve retornar 401 se o token não for enviado', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 401 se o token for inválido ou expirado', async () => {
      getAuthToken.mockReturnValue('token-invalido');
      verifyToken.mockReturnValue(null); // Simula um token que não pode ser verificado

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData()).error).toContain('Token ausente ou inválido');
    });

    it('deve retornar 403 se o usuário não for admin e não tiver a permissão necessária', async () => {
      verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });
      query.mockImplementationOnce(async () => ({ rows: [{ permissions: ['Posts/Artigos'] }] }));
      
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });

    it('deve retornar 429 se o Rate Limit de mutações for excedido', async () => {
      checkRateLimit.mockResolvedValueOnce(true); // Simula o limite atingido
      const { req, res } = createMocks({ method: 'POST' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
      expect(JSON.parse(res._getData()).error).toContain('Muitas requisições');
    });
  });

  describe('GET - Listar Usuários', () => {
    it('deve retornar 200, paginar os resultados e ignorar devolução de senhas', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: ['Usuários'] }] };
        if (sql.includes('SELECT COUNT(*)')) return { rows: [{ count: '2' }] };
        if (sql.includes('SELECT id, username, role')) return { 
          rows: [{ id: 1, username: 'admin' }, { id: 2, username: 'tester' }] 
        };
        return { rows: [] };
      });

      const { req, res } = createMocks({ method: 'GET', query: { page: '1', limit: '10' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const response = JSON.parse(res._getData());
      
      expect(response.data).toHaveLength(2);
      expect(response.pagination).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 });
    });

    it('deve incluir o filtro de busca corretamente (LOWER LIKE)', async () => {
      const { req, res } = createMocks({ method: 'GET', query: { search: 'Admin' } });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('LOWER(username) LIKE $1'), expect.arrayContaining(['%admin%']));
    });
  });

  describe('POST - Criar Usuário', () => {
    const validPayload = { username: 'novo_user', password: '123' };

    it('deve retornar 400 se username ou senha estiverem ausentes', async () => {
      const { req, res } = createMocks({ method: 'POST', body: { username: 'apenas_user' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se o usuário já existir no banco', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: ['Usuários'] }] };
        if (sql.includes('SELECT id FROM users WHERE username')) return { rows: [{ id: 99 }] }; // Já existe
        return { rows: [] };
      });

      const { req, res } = createMocks({ method: 'POST', body: validPayload });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).error).toContain('já está em uso');
    });

    it('deve aplicar o hash na senha, criar o usuário, registrar no log e retornar 201', async () => {
      createRecord.mockResolvedValueOnce({ id: 5, username: 'novo_user', role: 'admin' });

      const { req, res } = createMocks({ method: 'POST', body: validPayload });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(hashPassword).toHaveBeenCalledWith('123');
      expect(createRecord).toHaveBeenCalledWith('users', expect.objectContaining({ password: 'hashed_password_123' }), expect.any(Array));
      expect(logActivity).toHaveBeenCalledWith('admin_user', 'CRIAR USUÁRIO', 'USER', 5, expect.any(String), expect.any(String));
    });
  });

  describe('PUT - Atualizar Usuário', () => {
    it('deve fazer hash de uma NOVA senha se ela for fornecida', async () => {
      updateRecords.mockResolvedValueOnce([{ id: 2, username: 'editado' }]);
      
      const { req, res } = createMocks({ method: 'PUT', body: { id: 2, password: 'nova_senha' } });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(hashPassword).toHaveBeenCalledWith('nova_senha');
      expect(updateRecords).toHaveBeenCalledWith('users', expect.objectContaining({ password: 'hashed_password_123' }), { id: 2 }, expect.any(Array));
    });

    it('NÃO deve processar hash ou tentar alterar a senha se o campo vier vazio ou ausente', async () => {
      updateRecords.mockResolvedValueOnce([{ id: 2, username: 'editado' }]);
      
      const { req, res } = createMocks({ method: 'PUT', body: { id: 2, username: 'editado', password: '  ' } }); // Senha em branco
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(hashPassword).not.toHaveBeenCalled();
      // Verifica se a propriedade "password" foi efetivamente deletada do payload de atualização
      expect(updateRecords).toHaveBeenCalledWith('users', expect.not.objectContaining({ password: expect.anything() }), { id: 2 }, expect.any(Array));
    });
  });

  describe('DELETE - Excluir Usuário', () => {
    it('deve retornar 400 impedindo que o admin exclua a conta em que está logado (proteção contra lockout)', async () => {
      const { req, res } = createMocks({ method: 'DELETE', body: { id: 1 } }); // user autenticado é 1
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).error).toContain('sua própria conta');
    });

    it('deve retornar 200, excluir o usuário e gerar log se o alvo for de outro ID', async () => {
      const { req, res } = createMocks({ method: 'DELETE', body: { id: 3 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(deleteRecords).toHaveBeenCalledWith('users', { id: 3 });
    });
  });

  it('deve retornar 500 se o banco de dados cair abruptamente', async () => {
    query.mockRejectedValueOnce(new Error('Erro catastrófico do DB'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(500);
    consoleSpy.mockRestore();
  });
});