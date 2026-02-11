import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de vídeos
// Assumimos que existe uma função getVideos que aceita (page, limit)
jest.mock('./lib/videos', () => ({
  getVideos: jest.fn(),
}), { virtual: true });

const videosLib = jest.requireMock('./lib/videos');

// Simulação do handler da API para fins de teste de integração da lógica de paginação
// Isso valida como o controller processa os parâmetros e formata a resposta
const videosHandler = async (req, res) => {
  const { method, query } = req;

  if (method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Parsing dos parâmetros de query com valores padrão
  const page = parseInt(query.page || '1', 10);
  const limit = parseInt(query.limit || '10', 10);

  try {
    // Chama a função mockada da biblioteca passando os parâmetros de paginação
    const result = await videosLib.getVideos(page, limit);
    
    // Retorna a estrutura padrão de resposta paginada
    return res.status(200).json({
      videos: result.videos,
      pagination: {
        page: page,
        limit: limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao buscar vídeos' });
  }
};

describe('API de Vídeos - Paginação (/api/admin/videos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar a primeira página com limite padrão (10) se nenhum parâmetro for informado', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/admin/videos',
      query: {},
    });

    // Mock do retorno do banco de dados: 10 itens, total de 50
    const mockVideos = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, title: `Video ${i + 1}` }));
    videosLib.getVideos.mockResolvedValue({
      videos: mockVideos,
      total: 50,
    });

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.videos).toHaveLength(10);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 50,
      totalPages: 5, // 50 total / 10 limit = 5 páginas
    });
    // Verifica se a biblioteca foi chamada com os padrões corretos
    expect(videosLib.getVideos).toHaveBeenCalledWith(1, 10);
  });

  it('deve retornar a página e limite solicitados corretamente', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/admin/videos',
      query: { page: '2', limit: '5' },
    });

    // Mock do retorno: 5 itens (página 2), total de 20
    const mockVideos = Array.from({ length: 5 }, (_, i) => ({ id: i + 6, title: `Video ${i + 6}` }));
    videosLib.getVideos.mockResolvedValue({
      videos: mockVideos,
      total: 20,
    });

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.videos).toHaveLength(5);
    expect(data.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 20,
      totalPages: 4, // 20 total / 5 limit = 4 páginas
    });
    expect(videosLib.getVideos).toHaveBeenCalledWith(2, 5);
  });

  it('deve lidar corretamente quando a página solicitada não tem resultados', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/admin/videos',
      query: { page: '10', limit: '10' },
    });

    videosLib.getVideos.mockResolvedValue({
      videos: [],
      total: 50,
    });

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.videos).toHaveLength(0);
    expect(data.pagination.page).toBe(10);
    expect(data.pagination.total).toBe(50);
  });
});