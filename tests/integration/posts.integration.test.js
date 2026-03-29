import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// ===================================================================
// MOCKS - Devem ser definidos ANTES e de forma correta
// ===================================================================

// Mock posts - usando jest.fn() diretamente no mock
jest.mock('../../lib/domain/posts.js', () => ({
  getRecentPosts: jest.fn(),
}));

// Mock cache - retorna a função fetchFunction executada (sem cache real)
jest.mock('../../lib/cache.js', () => ({
  getOrSetCache: jest.fn(async (key, fetchFunction) => {
    // Executa a função diretamente, sem cache real nos testes
    return await fetchFunction();
  }),
  invalidateCache: jest.fn(),
  checkRateLimit: jest.fn().mockResolvedValue(false),
}));

// Importa os módulos APÓS os mocks estarem configurados
import { getRecentPosts } from '../../lib/domain/posts.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache.js';
import handler from '../../pages/api/posts.js';

describe('Integração de Posts (API/DB)', () => {
  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Restaura explicitamente as implementações de mock padrão para garantir
    // que não sejam afetadas por alguma configuração do Jest ou interações inesperadas.
    checkRateLimit.mockResolvedValue(false);
    getOrSetCache.mockImplementation(async (key, fetchFunction) => {
      return await fetchFunction();
    });
  });

  it('Endpoint API /api/posts deve retornar 200 e JSON de posts', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    // Configura o retorno do mock
    getRecentPosts.mockResolvedValue({
      data: [{ id: 1, title: 'Post de Teste' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getRecentPosts).toHaveBeenCalledTimes(1);
    expect(getRecentPosts).toHaveBeenCalledWith(10, 1);
    
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.data).toHaveLength(1);
    expect(jsonData.data[0].title).toBe('Post de Teste');
    expect(jsonData.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('Endpoint API /api/posts deve aceitar parâmetros de paginação', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '2', limit: '5' }
    });

    getRecentPosts.mockResolvedValue({
      data: [],
      pagination: { page: 2, limit: 5, total: 10, totalPages: 2 },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getRecentPosts).toHaveBeenCalledTimes(1);
    expect(getRecentPosts).toHaveBeenCalledWith(5, 2);
    
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.pagination.page).toBe(2);
    expect(jsonData.pagination.limit).toBe(5);
    expect(jsonData.pagination.total).toBe(10);
    expect(jsonData.pagination.totalPages).toBe(2);
  });

  it('Endpoint API /api/posts deve rejeitar métodos não GET', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.error).toBe('Method not allowed');
    
    // A função NÃO deve ser chamada quando o método é inválido
    expect(getRecentPosts).not.toHaveBeenCalled();
  });

  it('Endpoint API /api/posts deve rejeitar parâmetros inválidos - page < 1', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '0', limit: '10' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.error).toBe('Invalid pagination parameters');
    expect(getRecentPosts).not.toHaveBeenCalled();
  });

  it('Endpoint API /api/posts deve rejeitar parâmetros inválidos - limit < 1', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '1', limit: '0' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(getRecentPosts).not.toHaveBeenCalled();
  });

  it('Endpoint API /api/posts deve rejeitar parâmetros inválidos - limit > 100', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '1', limit: '150' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(getRecentPosts).not.toHaveBeenCalled();
  });

  it('Endpoint API /api/posts deve respeitar rate limit', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    // Simula rate limit ativo
    checkRateLimit.mockResolvedValue(true);

    await handler(req, res);

    expect(res._getStatusCode()).toBe(429);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.error).toBe('Too many requests');
    expect(getRecentPosts).not.toHaveBeenCalled();
  });

  it('Endpoint API /api/posts deve lidar com erros internos', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    // Silencia o console.error para este teste, pois o erro é esperado e verificado.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Simula um erro na função
    getRecentPosts.mockRejectedValue(new Error('Database error'));

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.error).toBe('Internal server error');
    expect(getRecentPosts).toHaveBeenCalledTimes(1);

    // Restaura a implementação original do console.error para não afetar outros testes.
    consoleSpy.mockRestore();
  });

  it('Endpoint API /api/posts deve usar valores padrão quando query params estão ausentes', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {} // sem parâmetros
    });

    getRecentPosts.mockResolvedValue({
      data: [{ id: 1, title: 'Post' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    // Deve usar valores padrão: page=1, limit=10
    expect(getRecentPosts).toHaveBeenCalledWith(10, 1);
  });

  it('Endpoint API /api/posts deve chamar getOrSetCache com a chave correta', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '2', limit: '5' }
    });

    getRecentPosts.mockResolvedValue({
      data: [],
      pagination: { page: 2, limit: 5, total: 10, totalPages: 2 },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getOrSetCache).toHaveBeenCalledTimes(1);
    
    // Verifica a chave do cache
    const cacheKey = getOrSetCache.mock.calls[0][0];
    expect(cacheKey).toBe('posts:2:5');
  });
});