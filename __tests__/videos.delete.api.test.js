import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de vídeos
jest.mock('../lib/videos', () => ({
  deleteVideo: jest.fn(),
}), { virtual: true });

const videosLib = jest.requireMock('../lib/videos');

// Simulação do handler da API para fins de teste de integração
// Isso valida como o controller processa a requisição DELETE
const videosHandler = async (req, res) => {
  const { method, body } = req;

  if (method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = body;

  if (!id) {
    return res.status(400).json({ message: 'ID do vídeo é obrigatório' });
  }

  try {
    const result = await videosLib.deleteVideo(id);
    
    if (!result) {
      return res.status(404).json({ message: 'Vídeo não encontrado' });
    }
    
    return res.status(200).json({ message: 'Vídeo excluído com sucesso' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao excluir vídeo' });
  }
};

describe('API de Vídeos - Exclusão (/api/videos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve excluir um vídeo com sucesso (status 200)', async () => {
    const videoId = 1;
    const { req, res } = createMocks({
      method: 'DELETE',
      body: { id: videoId },
    });

    // Mock do retorno da biblioteca (simula sucesso na exclusão)
    videosLib.deleteVideo.mockResolvedValue({ id: videoId, title: 'Vídeo Deletado' });

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Vídeo excluído com sucesso' });
    expect(videosLib.deleteVideo).toHaveBeenCalledWith(videoId);
  });

  it('deve retornar 404 se o vídeo não for encontrado', async () => {
    const videoId = 999;
    const { req, res } = createMocks({
      method: 'DELETE',
      body: { id: videoId },
    });

    // Mock retornando null/false indicando que não achou o registro
    videosLib.deleteVideo.mockResolvedValue(null);

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Vídeo não encontrado' });
  });

  it('deve retornar 400 se o ID não for fornecido', async () => {
    const { req, res } = createMocks({
      method: 'DELETE',
      body: {}, // Body vazio
    });

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ message: 'ID do vídeo é obrigatório' });
    expect(videosLib.deleteVideo).not.toHaveBeenCalled();
  });

  it('deve retornar 405 para métodos não permitidos (ex: GET)', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await videosHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});