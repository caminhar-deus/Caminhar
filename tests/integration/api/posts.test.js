import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks declarados ANTES da importação do handler
jest.mock('../../../lib/domain/posts.js', () => ({
  getRecentPosts: jest.fn(),
}));

jest.mock('../../../lib/cache.js', () => require('../../mocks/cache').mockCacheModule());

jest.mock('../../../lib/auth.js', () => ({
  withAuth: jest.fn((handler) => handler),
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// Importa o handler
import handler from '../../../pages/api/posts.js';

// Importa as funções mockadas para controlá-las
import { getRecentPosts } from '../../../lib/domain/posts.js';
import { getOrSetCache, checkRateLimit } from '../../../lib/cache.js';

describe('API Pública de Posts (GET /api/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getOrSetCache.mockImplementation(async (key, fetchFunction) => await fetchFunction());
    checkRateLimit.mockResolvedValue(false);
  });

  it('deve retornar 200 e a lista de posts com sucesso (Valores Default)', async () => {
    const mockPostsResult = {
      data: [{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
    };

    getRecentPosts.mockResolvedValue(mockPostsResult);

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = res._getJSONData();

    expect(responseData.success).toBe(true);
    expect(responseData.data).toEqual(mockPostsResult.data);
    expect(getRecentPosts).toHaveBeenCalledWith(10, 1, ''); // limit, page, search
    expect(getOrSetCache).toHaveBeenCalledWith('posts:list:1:10', expect.any(Function), 7200);
  });

  it('deve repassar os parâmetros de paginação e busca corretamente', async () => {
    getRecentPosts.mockResolvedValue({ data: [], pagination: {} });

    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '3', limit: '20', search: 'teste' }
    });
    await handler(req, res);

    expect(getRecentPosts).toHaveBeenCalledWith(20, 3, 'teste');
    expect(getOrSetCache).toHaveBeenCalledWith('posts:search:3:20:teste', expect.any(Function), 1800);
  });

  it('deve retornar 400 se os parâmetros de paginação forem inválidos (ex: negativos ou acima de 100)', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { page: '-1' } });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'Bad Request', message: 'Parâmetros de paginação inválidos' });
  });

  it('deve retornar 500 em caso de erro interno no servidor ou banco de dados', async () => {
    getRecentPosts.mockRejectedValue(new Error('Falha no banco de dados simulada'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Internal Server Error', message: 'Erro interno do servidor ao buscar posts' });
    consoleSpy.mockRestore();
  });
});