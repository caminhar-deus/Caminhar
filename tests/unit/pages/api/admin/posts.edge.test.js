import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import handler from '../../../../../pages/api/admin/posts.js';
import * as auth from '../../../../../lib/auth.js';
import * as db from '../../../../../lib/db.js';
import * as cache from '../../../../../lib/cache.js';
import * as posts from '../../../../../lib/domain/posts.js';

jest.mock('../../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
  withAuth: jest.fn((handler) => handler)
}));

jest.mock('../../../../../lib/db.js', () => ({
  query: jest.fn()
}));

jest.mock('../../../../../lib/cache.js', () => ({
  checkRateLimit: jest.fn(),
  invalidateCache: jest.fn()
}));

jest.mock('../../../../../lib/domain/posts.js', () => ({
  getPaginatedPosts: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn()
}));

jest.mock('../../../../../lib/crud.js', () => ({
  updateRecords: jest.fn()
}));

jest.mock('../../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn()
}));

describe('API - Admin - Posts (Edge Cases)', () => {
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
      method: 'POST',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      body: {},
      query: {}
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };
    cache.checkRateLimit.mockResolvedValue(false);
  });

  it('deve retornar 401 se req.user não estiver presente', async () => {
    req.user = null;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve retornar 403 se o usuário não for admin e não tiver permissão', async () => {
    req.user = { role: 'editor', username: 'editor' };
    db.query.mockResolvedValueOnce({ rows: [{ permissions: ['Outra_Permissao'] }] });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve assumir array vazio se usuário não tiver permissões cadastradas', async () => {
    req.user = { role: 'unknown', username: 'unknown' };
    db.query.mockResolvedValueOnce({ rows: [] }); // Sem permissões no banco

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve retornar erro de validação (Zod) se a image_url for inválida no POST', async () => {
    req.user = { role: 'admin', username: 'admin' };
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] });
    req.body = { title: 'Post', slug: 'post', image_url: 'invalid_url' };

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve retornar erro se o ID for inválido no PUT', async () => {
    req.user = { role: 'admin', username: 'admin' };
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] });
    req.method = 'PUT';
    req.body = { id: -1, title: 'Atualizado' }; // -1 engatilha a validação .positive()

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve retornar erro se nenhum dado for fornecido para atualização no PUT', async () => {
    req.user = { role: 'admin', username: 'admin' };
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] });
    req.method = 'PUT';
    req.body = { id: 1 }; // Somente ID

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Nenhum dado fornecido para atualização' }));
  });

  it('deve retornar erro de validação se a image_url for inválida no PUT', async () => {
    req.user = { role: 'admin', username: 'admin' };
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] });
    req.method = 'PUT';
    req.body = { id: 1, image_url: 'invalid_url' };

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve retornar 500 se o DELETE falhar no catch', async () => {
    req.user = { role: 'admin', username: 'admin' };
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] }); 
    db.query.mockResolvedValueOnce({ rows: [{ title: 'Post 1' }] }); 
    req.method = 'DELETE';
    req.body = { id: 1 };

    posts.deletePost.mockRejectedValueOnce(new Error('DB falhou'));

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('deve retornar 500 se ocorrer um erro interno durante a atualização (PUT)', async () => {
    req.user = { role: 'admin', username: 'admin' };
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] });
    req.method = 'PUT';
    req.body = { id: 1, title: 'Novo Título' };

    posts.updatePost.mockRejectedValueOnce(new Error('Erro forçado ao atualizar'));

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('deve bloquear métodos HTTP não permitidos (405)', async () => {
    req.user = { role: 'admin', username: 'admin' };
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] });
    req.method = 'PATCH';

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('deve atualizar a ordem dos posts com sucesso (reorder)', async () => {
    req.user = { role: 'admin', username: 'admin' };
    db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] });
    req.method = 'PUT';
    req.body = { action: 'reorder', items: [{ id: 1, position: 2 }, { id: 2, position: 1 }] };

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Ordem atualizada' }));
  });
});