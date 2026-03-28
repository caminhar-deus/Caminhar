import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/admin/posts';
import { getPaginatedPosts, createPost, updatePost, deletePost, logActivity, updateRecords, query } from '../../../../lib/db';
import { invalidateCache } from '../../../../lib/cache';

jest.mock('../../../../lib/db', () => ({
  getPaginatedPosts: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
  logActivity: jest.fn(),
  updateRecords: jest.fn(),
  query: jest.fn()
}));

jest.mock('../../../../lib/cache', () => ({
  invalidateCache: jest.fn(),
  checkRateLimit: jest.fn().mockResolvedValue(false), // Mock para o rate limit
}));

// Ignora verificação de Token real
jest.mock('../../../../lib/auth', () => ({
  withAuth: (fn) => (req, res) => {
    // Adiciona um 'role' para testar a lógica de permissão da API
    req.user = { username: 'test_editor', role: 'editor' };
    return fn(req, res);
  }
}));

describe('Integração: API de Admin Posts (/api/admin/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock padrão para a consulta de permissões para evitar TypeErrors.
    // Simula um usuário com as permissões necessárias para os testes.
    query.mockResolvedValue({ rows: [{ permissions: ['Posts/Artigos'] }] });
  });

  it('GET: deve retornar a lista paginada de posts', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { page: 1, limit: 10 } });
    getPaginatedPosts.mockResolvedValueOnce({ posts: [{ title: 'Teste' }], pagination: { total: 1 } });
    
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
  });

  it('POST: deve retornar 400 se faltar o título', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { slug: 'slug-teste' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('POST: deve criar um novo post e invalidar cache', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { title: 'T', slug: 's' } });
    createPost.mockResolvedValueOnce({ id: 1, title: 'T' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(201);
    expect(logActivity).toHaveBeenCalled();
    expect(invalidateCache).toHaveBeenCalledWith('posts:public:all');
  });

  it('PUT: deve atualizar o posicionamento de posts no modo reorder (Drag & Drop)', async () => {
    const { req, res } = createMocks({ method: 'PUT', body: { action: 'reorder', items: [{ id: 1, position: 2 }] } });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(updateRecords).toHaveBeenCalledWith('posts', { position: 2 }, { id: 1 });
  });

  it('DELETE: deve excluir um post com sucesso', async () => {
    const { req, res } = createMocks({ method: 'DELETE', body: { id: 1 } });
    // A primeira chamada a query é para permissões (mockada no beforeEach, mas sobrescrita aqui para clareza)
    // A segunda chamada é para buscar o título para o log de auditoria
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Posts/Artigos'] }] })
         .mockResolvedValueOnce({ rows: [{ title: 'Post Antigo' }] });
    deletePost.mockResolvedValueOnce({ id: 1 });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(deletePost).toHaveBeenCalledWith(1);
    expect(logActivity).toHaveBeenCalled();
  });
});