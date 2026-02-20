import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/videos';
import { query } from '../lib/db';

// Mock do módulo db para não acessar o banco de dados real
jest.mock('../lib/db', () => ({
  query: jest.fn(),
}));

describe('API Pública de Vídeos (/api/videos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar lista de vídeos publicados com status 200', async () => {
    const mockVideos = [
      { id: 1, titulo: 'Vídeo 1', url_youtube: 'https://youtu.be/1', descricao: 'Desc 1' },
      { id: 2, titulo: 'Vídeo 2', url_youtube: 'https://youtu.be/2', descricao: 'Desc 2' }
    ];

    // Simula o retorno da query
    query.mockResolvedValue({ rows: mockVideos });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockVideos);
    expect(query).toHaveBeenCalledTimes(1);
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

    query.mockRejectedValue(new Error('Erro de conexão com banco'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.message).toBe('Erro interno do servidor ao buscar vídeos.');
    expect(data.details).toBe('Erro de conexão com banco');

    // Restaura o console.error original
    consoleSpy.mockRestore();
  });
});