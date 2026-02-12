import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/musicas';
import { getPublishedMusicas } from '../lib/musicas';

// Mock da lib de músicas para não acessar o banco de dados real
jest.mock('../lib/musicas', () => ({
  getPublishedMusicas: jest.fn(),
}));

describe('API Pública de Músicas (/api/musicas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar lista de músicas publicadas com status 200', async () => {
    const mockMusicas = [
      { id: 1, titulo: 'Música 1', artista: 'Artista A', publicado: true },
      { id: 2, titulo: 'Música 2', artista: 'Artista B', publicado: true }
    ];

    // Simula o retorno da função da lib
    getPublishedMusicas.mockResolvedValue(mockMusicas);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    const responseData = JSON.parse(res._getData());
    
    expect(res._getStatusCode()).toBe(200);
    // Verifica o formato padronizado da API
    expect(responseData).toMatchObject({
      success: true,
      data: mockMusicas,
      meta: expect.objectContaining({
        timestamp: expect.any(String),
        requestId: expect.any(String),
        count: 2,
        search: null,
      }),
    });
    // Verifica se a função foi chamada sem termo de busca
    expect(getPublishedMusicas).toHaveBeenCalledWith(undefined);
  });

  it('deve repassar o termo de busca para a função getPublishedMusicas', async () => {
    const searchTerm = 'Hino';
    getPublishedMusicas.mockResolvedValue([]);

    const { req, res } = createMocks({
      method: 'GET',
      query: { search: searchTerm }
    });

    await handler(req, res);

    const responseData = JSON.parse(res._getData());
    
    expect(res._getStatusCode()).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data).toEqual([]);
    expect(responseData.meta.search).toBe(searchTerm);
    expect(getPublishedMusicas).toHaveBeenCalledWith(searchTerm);
  });

  it('deve retornar erro 405 para métodos não permitidos (ex: POST)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    const responseData = JSON.parse(res._getData());
    
    expect(res._getStatusCode()).toBe(405);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toMatchObject({
      code: 'METHOD_NOT_ALLOWED',
      message: expect.stringContaining('POST'),
    });
  });

  it('deve retornar erro 500 em caso de falha interna', async () => {
    // Silencia o console.error para este teste específico pois o erro é esperado
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    getPublishedMusicas.mockRejectedValue(new Error('Erro de conexão com banco'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    const responseData = JSON.parse(res._getData());
    
    expect(res._getStatusCode()).toBe(500);
    // Verifica o formato padronizado de erro
    expect(responseData).toMatchObject({
      success: false,
      error: {
        code: expect.any(String),
        message: expect.any(String),
      },
      meta: expect.objectContaining({
        timestamp: expect.any(String),
        requestId: expect.any(String),
      }),
    });

    // Restaura o console.error original
    consoleSpy.mockRestore();
  });
});
