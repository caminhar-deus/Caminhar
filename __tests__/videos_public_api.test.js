import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/videos';
import { getPublishedVideos } from '../lib/videos';

// Mock da lib de vídeos para não acessar o banco de dados real
jest.mock('../lib/videos', () => ({
  getPublishedVideos: jest.fn(),
}));

describe('API Pública de Vídeos (/api/videos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar lista de vídeos publicados com status 200', async () => {
    const mockVideos = [
      { id: 1, titulo: 'Vídeo 1', url_youtube: 'https://youtu.be/1', publicado: true },
      { id: 2, titulo: 'Vídeo 2', url_youtube: 'https://youtu.be/2', publicado: true }
    ];

    // Simula o retorno da função da lib
    getPublishedVideos.mockResolvedValue(mockVideos);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockVideos);
    // Verifica se a função foi chamada sem termo de busca
    expect(getPublishedVideos).toHaveBeenCalledWith(undefined);
  });

  it('deve repassar o termo de busca para a função getPublishedVideos', async () => {
    const searchTerm = 'Culto';
    getPublishedVideos.mockResolvedValue([]);

    const { req, res } = createMocks({
      method: 'GET',
      query: { search: searchTerm }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getPublishedVideos).toHaveBeenCalledWith(searchTerm);
  });

  it('deve retornar erro 405 para métodos não permitidos (ex: POST)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar erro 500 em caso de falha interna', async () => {
    // Silencia o console.error para este teste específico pois o erro é esperado
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    getPublishedVideos.mockRejectedValue(new Error('Erro de conexão com banco'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Erro ao buscar vídeos' });

    // Restaura o console.error original
    consoleSpy.mockRestore();
  });
});