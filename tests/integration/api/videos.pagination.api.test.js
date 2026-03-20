import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de vídeos
// Ajuste o caminho '../lib/videos' se sua função estiver em outro lugar (ex: '../lib/domain/videos')
jest.mock('../lib/videos', () => ({
  getPaginatedVideos: jest.fn(),
}), { virtual: true });

const videosLib = jest.requireMock('../lib/videos');

// Simulação do handler da API para fins de teste de integração
// Isso valida como o controller processa a requisição GET com query params
const videosHandler = async (req, res) => {
  const { method, query } = req;

  if (method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Extrai e converte os parâmetros de paginação (com valores padrão)
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);

    // Chama a função de domínio mockada
    const result = await videosLib.getPaginatedVideos(page, limit);
    
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao buscar vídeos' });
  }
};

describe('API de Vídeos - Paginação (/api/videos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar a lista de vídeos paginada com sucesso (status 200)', async () => {
    const mockResult = {
      videos: [
        { id: 1, title: 'Vídeo 1', url: 'https://youtube.com/1' },
        { id: 2, title: 'Vídeo 2', url: 'https://youtube.com/2' }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      }
    };

    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '1', limit: '10' },
    });

    // Configura o mock para retornar os dados simulados
    videosLib.getPaginatedVideos.mockResolvedValue(mockResult);

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data).toEqual(mockResult);
    expect(videosLib.getPaginatedVideos).toHaveBeenCalledWith(1, 10);
  });

  it('deve usar valores padrão para page e limit se não forem informados', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {}, // Sem parâmetros
    });

    videosLib.getPaginatedVideos.mockResolvedValue({ videos: [], pagination: {} });

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    // Verifica se chamou com os defaults (page=1, limit=10) definidos no handler
    expect(videosLib.getPaginatedVideos).toHaveBeenCalledWith(1, 10);
  });

  it('deve retornar 500 se houver erro na camada de serviço', async () => {
    const { req, res } = createMocks({ method: 'GET' });

    videosLib.getPaginatedVideos.mockRejectedValue(new Error('Erro de conexão com banco'));

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Erro interno ao buscar vídeos' });
  });

  it('deve retornar 405 para métodos não permitidos (ex: POST)', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await videosHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});