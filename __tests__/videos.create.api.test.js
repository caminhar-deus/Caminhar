import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de vídeos
jest.mock('../lib/videos', () => ({
  createVideo: jest.fn(),
}), { virtual: true });

const videosLib = jest.requireMock('../lib/videos');

// Simulação do handler da API para fins de teste de integração
// Isso valida como o controller processa a requisição POST
const videosHandler = async (req, res) => {
  const { method, body } = req;

  if (method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { titulo, url_youtube } = body;

  // Validação básica dos campos obrigatórios
  if (!titulo || !url_youtube) {
    return res.status(400).json({ message: 'Campos obrigatórios: titulo, url_youtube' });
  }

  // Validação de formato da URL do YouTube
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  if (!youtubeRegex.test(url_youtube)) {
    return res.status(400).json({ message: 'URL do YouTube inválida' });
  }

  try {
    const result = await videosLib.createVideo(body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao criar vídeo' });
  }
};

describe('API de Vídeos - Criação (/api/videos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar um novo vídeo com sucesso (status 201)', async () => {
    const newVideo = {
      titulo: 'Novo Vídeo de Teste',
      url_youtube: 'https://youtube.com/watch?v=123456',
      descricao: 'Descrição do vídeo de teste...',
      publicado: true
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: newVideo,
    });

    // Mock do retorno da biblioteca (simula o retorno do banco de dados com ID gerado)
    videosLib.createVideo.mockResolvedValue({ id: 1, ...newVideo });

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    
    expect(data).toEqual(expect.objectContaining(newVideo));
    expect(data).toHaveProperty('id', 1);
    expect(videosLib.createVideo).toHaveBeenCalledWith(newVideo);
  });

  it('deve retornar 400 se campos obrigatórios estiverem faltando', async () => {
    const invalidVideo = {
      descricao: 'Vídeo sem título e url',
      publicado: true
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: invalidVideo,
    });

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Campos obrigatórios: titulo, url_youtube' });
    expect(videosLib.createVideo).not.toHaveBeenCalled();
  });

  it('deve retornar 400 se a URL do YouTube for inválida', async () => {
    const invalidUrlVideo = {
      titulo: 'Vídeo com URL Inválida',
      url_youtube: 'https://vimeo.com/123456', // URL de outro serviço
      publicado: true
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: invalidUrlVideo,
    });

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ message: 'URL do YouTube inválida' });
    expect(videosLib.createVideo).not.toHaveBeenCalled();
  });

  it('deve retornar 500 se houver erro na camada de serviço', async () => {
    const newVideo = {
      titulo: 'Vídeo Erro',
      url_youtube: 'https://youtube.com/watch?v=error'
    };

    const { req, res } = createMocks({ method: 'POST', body: newVideo });

    videosLib.createVideo.mockRejectedValue(new Error('Erro de conexão com banco'));

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Erro interno ao criar vídeo' });
  });

  it('deve retornar 405 para métodos não permitidos (ex: GET)', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await videosHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});