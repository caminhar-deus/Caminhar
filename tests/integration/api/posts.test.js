import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks declarados ANTES da importação do handler
jest.mock('../../../lib/domain/posts.js', () => ({
  getRecentPosts: jest.fn(),
}));

jest.mock('../../../lib/cache.js', () => ({
  // Simula o comportamento real do cache de executar o callback passado
  getOrSetCache: jest.fn(async (key, fetchFunction) => await fetchFunction()),
  checkRateLimit: jest.fn(),
}));

// Importa o handler
import handler from '../../../pages/api/posts.js';

// Importa as funções mockadas para controlá-las
import { getRecentPosts } from '../../../lib/domain/posts.js';
import { getOrSetCache, checkRateLimit } from '../../../lib/cache.js';

describe('API Pública de Posts (GET /api/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-estabelece a implementação do mock caso o Jest o resete automaticamente
    getOrSetCache.mockImplementation(async (key, fetchFunction) => await fetchFunction());
    // Garante que o rate limit não vai bloquear os testes de sucesso por padrão
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
    const responseData = JSON.parse(res._getData());
    
    expect(responseData.success).toBe(true);
    expect(responseData.data).toEqual(mockPostsResult.data);
    expect(getRecentPosts).toHaveBeenCalledWith(10, 1, ''); // limit, page, search
    expect(getOrSetCache).toHaveBeenCalledWith('posts:1:10', expect.any(Function));
  });

  it('deve repassar os parâmetros de paginação e busca corretamente', async () => {
    getRecentPosts.mockResolvedValue({ data: [], pagination: {} });

    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '3', limit: '20', search: 'teste' }
    });
    await handler(req, res);

    expect(getRecentPosts).toHaveBeenCalledWith(20, 3, 'teste');
    expect(getOrSetCache).toHaveBeenCalledWith('posts:3:20:teste', expect.any(Function));
  });

  it('deve retornar 400 se os parâmetros de paginação forem inválidos (ex: negativos ou acima de 100)', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { page: '-1' } });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Invalid pagination parameters' });
  });

  it('deve retornar 429 se o limite de requisições (Rate Limit) for excedido', async () => {
    checkRateLimit.mockResolvedValue(true); // Simula o bloqueio

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(429);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Too many requests' });
  });

  it('deve retornar 500 em caso de erro interno no servidor ou banco de dados', async () => {
    getRecentPosts.mockRejectedValue(new Error('Falha no banco de dados simulada'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Internal server error' });
    consoleSpy.mockRestore();
  });
});