import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/v1/videos';

// Mock do módulo db para não acessar o banco de dados real
jest.mock('../../lib/db', () => ({
  query: jest.fn(),
}));

// Mock do cache para evitar dependências externas
jest.mock('../../lib/cache', () => ({
  getOrSetCache: jest.fn(),
  invalidateCache: jest.fn(),
}));

// Import dos mocks para usar nas funções
const { query } = require('../../lib/db');
const { getOrSetCache } = require('../../lib/cache');

describe('API Pública de Vídeos (/api/videos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar lista de vídeos publicados com status 200', async () => {
    const mockVideos = [
      { id: 1, titulo: 'Vídeo 1', url_youtube: 'https://youtu.be/1', descricao: 'Desc 1' },
      { id: 2, titulo: 'Vídeo 2', url_youtube: 'https://youtu.be/2', descricao: 'Desc 2' }
    ];

    // Mock do cache para retornar os dados simulados
    getOrSetCache.mockResolvedValue({
      videos: mockVideos,
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
    });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.success).toBe(true);
    expect(responseData.data.videos).toEqual(mockVideos);
    expect(responseData.data.pagination).toBeDefined();
    expect(getOrSetCache).toHaveBeenCalledTimes(1);
  });

  it('deve retornar erro 405 para métodos não permitidos (ex: PUT)', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar erro 500 em caso de falha interna', async () => {
    // Silencia o console.error para este teste específico pois o erro é esperado
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock do cache para retornar erro
    getOrSetCache.mockRejectedValue(new Error('Erro de conexão com banco'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.message).toBe('Erro interno do servidor');

    // Restaura o console.error original
    consoleSpy.mockRestore();
  });
});