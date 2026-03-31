import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/videos';

// Mock das dependências do handler para isolar o teste
jest.mock('../../lib/domain/videos.js', () => ({
  getPublicPaginatedVideos: jest.fn(),
}));

jest.mock('../../lib/cache', () => ({
  getOrSetCache: jest.fn(async (key, fetchFunction) => fetchFunction()),
  checkRateLimit: jest.fn().mockResolvedValue(false),
}));

// Import dos mocks para usar nas funções
import { getPublicPaginatedVideos } from '../../lib/domain/videos.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache.js';

describe('API Pública de Vídeos (/api/videos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Garante que o mock do cache chame a função real (que por sua vez está mockada)
    getOrSetCache.mockImplementation(async (key, fetchFunction) => fetchFunction());
    checkRateLimit.mockResolvedValue(false);
  });

  it('deve retornar lista de vídeos publicados com status 200', async () => {
    const mockVideos = [
      { id: 1, titulo: 'Vídeo 1', url_youtube: 'https://youtu.be/1', descricao: 'Desc 1' },
      { id: 2, titulo: 'Vídeo 2', url_youtube: 'https://youtu.be/2', descricao: 'Desc 2' }
    ];

    // Mock da função de domínio para retornar os dados simulados
    getPublicPaginatedVideos.mockResolvedValue({
      data: mockVideos,
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
    });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.success).toBe(true);
    expect(responseData.data).toEqual(mockVideos);
    expect(responseData.pagination).toBeDefined();
    expect(getOrSetCache).toHaveBeenCalledTimes(1);
    expect(getPublicPaginatedVideos).toHaveBeenCalledWith(1, 10, '');
  });

  it('deve retornar erro 405 para métodos não permitidos (ex: PUT)', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' });
  });

  it('deve retornar erro 500 em caso de falha interna', async () => {
    // Silencia o console.error para este teste específico pois o erro é esperado
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock da função de domínio para simular um erro
    getPublicPaginatedVideos.mockRejectedValue(new Error('Erro de conexão com banco'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.success).toBeUndefined();
    expect(data.error).toBe('Internal server error');

    // Restaura o console.error original
    consoleSpy.mockRestore();
  });
});