import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../../lib/db.js', () => ({
  query: jest.fn(),
}));

jest.mock('../../../../lib/domain/posts.js', () => ({
  getPaginatedPosts: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
}));

jest.mock('../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn(),
}));

jest.mock('../../../../lib/crud.js', () => ({
  updateRecords: jest.fn(),
}));

jest.mock('../../../../lib/cache.js', () => ({
  invalidateCache: jest.fn(),
  checkRateLimit: jest.fn(),
}));

// Mock do middleware com suporte para injetar usuário customizado
jest.mock('../../../../lib/auth.js', () => ({
  withAuth: jest.fn((handler) => async (req, res) => {
    if (req.headers.authorization !== 'Bearer valid-token') {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    req.user = req._userOverride || { userId: 1, username: 'admin', role: 'admin' };
    return handler(req, res);
  }),
}));

import handler from '../../../../pages/api/admin/posts.js';
import { query } from '../../../../lib/db.js';
import { getPaginatedPosts, createPost, updatePost, deletePost } from '../../../../lib/domain/posts.js';
import { logActivity } from '../../../../lib/domain/audit.js';
import { updateRecords } from '../../../../lib/crud.js';
import { invalidateCache, checkRateLimit } from '../../../../lib/cache.js';

describe('API Admin - Gestão de Posts (/api/admin/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    checkRateLimit.mockResolvedValue(false); // Sem rate limit por padrão
    
    // Mock padrão para a validação de permissões de RBAC
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Posts/Artigos'] }] };
      }
      return { rows: [] };
    });
  });

  const getAuthenticatedMocks = (options = {}, userOverride = null) => {
    const { req, res } = createMocks({
      ...options,
      headers: { ...options.headers, authorization: 'Bearer valid-token' },
    });
    if (userOverride) req._userOverride = userOverride;
    req.socket = { remoteAddress: '127.0.0.1' };
    return { req, res };
  };

  describe('Segurança, Autorização e Rate Limit', () => {
    it('deve retornar 401 se não estiver autenticado', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 403 se o usuário não for admin e não tiver permissão', async () => {
      query.mockResolvedValueOnce({ rows: [{ permissions: ['Dashboard'] }] }); // Sem permissão de posts
      const { req, res } = getAuthenticatedMocks({ method: 'GET' }, { userId: 2, username: 'editor', role: 'comum' });
      
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData()).error).toContain('Acesso negado');
    });

    it('deve retornar 429 se o Rate Limit for excedido ao realizar mutações', async () => {
      checkRateLimit.mockResolvedValueOnce(true); // Excedeu o limite
      const { req, res } = getAuthenticatedMocks({ method: 'POST' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
    });
  });

  describe('GET - Listar Posts', () => {
    it('deve retornar 200, cabeçalhos de controle de cache e os posts paginados', async () => {
      const mockResult = { data: [{ id: 1, title: 'Post 1' }], pagination: { page: 1, total: 1, totalPages: 1 } };
      getPaginatedPosts.mockResolvedValueOnce(mockResult);

      const { req, res } = getAuthenticatedMocks({ method: 'GET', query: { page: '1', limit: '10' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockResult);
      expect(res.getHeader('Cache-Control')).toBe('no-store, max-age=0, must-revalidate');
    });

    it('deve retornar 500 em caso de falha no domínio', async () => {
      getPaginatedPosts.mockRejectedValueOnce(new Error('Falha no banco'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('POST - Criar Post', () => {
    const validPost = { title: 'Título', slug: 'titulo', content: 'Conteúdo' };

    it('deve retornar 400 se a validação do Zod falhar (ex: sem título)', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: { slug: 'titulo' } });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).errors).toHaveProperty('title');
    });

    it('deve criar o post, registrar auditoria, invalidar cache e retornar 201', async () => {
      const mockPost = { id: 10, ...validPost };
      createPost.mockResolvedValueOnce(mockPost);

      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: validPost });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockPost);
      expect(logActivity).toHaveBeenCalledWith('admin', 'CRIAR POST', 'POST', 10, expect.any(String), '127.0.0.1');
      expect(invalidateCache).toHaveBeenCalledWith('posts:public:all');
    });

    it('deve retornar 500 se ocorrer um erro ao criar', async () => {
      createPost.mockRejectedValueOnce(new Error('Erro DB'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: validPost });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('PUT - Atualizar e Reordenar Posts', () => {
    it('deve validar e processar reordenação em massa e retornar 200', async () => {
      const body = { action: 'reorder', items: [{ id: 1, position: 2 }, { id: 2, position: 1 }] };
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(updateRecords).toHaveBeenCalledTimes(2);
      expect(invalidateCache).toHaveBeenCalledWith('posts:public:all');
    });

    it('deve retornar 400 se a reordenação for inválida (items vazios ou estrutura incorreta)', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { action: 'reorder', items: [] } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se o ID do post não for fornecido ou for inválido', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { id: 'abc', title: 'A' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se não houver dados reais para atualizar além do ID', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { id: 1 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 404 se o post a atualizar não existir', async () => {
      updatePost.mockResolvedValueOnce(null);
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { id: 99, title: 'Valid' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });

    it('deve atualizar os dados do post e retornar 200', async () => {
      const mockUpdated = { id: 1, title: 'Atualizado' };
      updatePost.mockResolvedValueOnce(mockUpdated);

      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { id: 1, title: 'Atualizado' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(invalidateCache).toHaveBeenCalledWith('posts:public:all');
    });

    it('deve retornar 500 se ocorrer um erro ao atualizar', async () => {
      updatePost.mockRejectedValueOnce(new Error('Erro DB'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { id: 1, title: 'Atualizado' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('DELETE - Excluir Post', () => {
    it('deve retornar 400 se o ID não for fornecido', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: {} });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve excluir o post, buscar o nome correto para a auditoria e retornar 200', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: ['Posts/Artigos'] }] };
        if (sql.includes('SELECT title FROM posts')) return { rows: [{ title: 'Post Para Excluir' }] };
        return { rows: [] };
      });
      deletePost.mockResolvedValueOnce({ id: 1 });

      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: { id: 1 } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(logActivity).toHaveBeenCalledWith(expect.any(String), 'EXCLUIR POST', 'POST', 1, 'Removeu o artigo: Post Para Excluir', '127.0.0.1');
      expect(invalidateCache).toHaveBeenCalledWith('posts:public:all');
    });

    it('deve retornar 404 se o post não for encontrado para exclusão', async () => {
      deletePost.mockResolvedValueOnce(null);
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: { id: 99 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });

    it('deve retornar 500 se ocorrer um erro ao excluir', async () => {
      deletePost.mockRejectedValueOnce(new Error('Erro DB'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: { id: 1 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });
});