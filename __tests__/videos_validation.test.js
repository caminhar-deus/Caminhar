import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/admin/videos';
import { createVideo, updateVideo } from '../lib/db';

// Mock do módulo de autenticação para ignorar a verificação de token neste teste
jest.mock('../lib/auth', () => ({
  withAuth: (handler) => (req, res) => handler(req, res),
}));

// Mock das funções do lib/db para não acessar o banco de dados
jest.mock('../lib/db', () => ({
  createVideo: jest.fn(),
  updateVideo: jest.fn(),
  getPaginatedVideos: jest.fn(),
  deleteVideo: jest.fn(),
}));

describe('Validação de API de Vídeos - Limite de Caracteres', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar erro 400 quando a descrição excede 500 caracteres (POST)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        titulo: 'Teste Tamanho Descrição',
        url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        descricao: 'a'.repeat(501) // 501 caracteres
      },
      headers: { host: 'localhost:3000' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: 'A descrição deve ter no máximo 500 caracteres'
      })
    );
  });

  it('deve retornar erro 400 quando a descrição excede 500 caracteres (PUT)', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        id: 1,
        titulo: 'Teste Tamanho Descrição',
        url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        descricao: 'a'.repeat(501)
      },
      headers: { host: 'localhost:3000' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: 'A descrição deve ter no máximo 500 caracteres'
      })
    );
  });

  it('deve permitir descrição com 500 caracteres exatos', async () => {
    createVideo.mockResolvedValue({ id: 1, titulo: 'Sucesso' });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        titulo: 'Teste Limite Exato',
        url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        descricao: 'a'.repeat(500)
      },
      headers: { host: 'localhost:3000' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
  });

  it('deve retornar erro 404 ao tentar atualizar um vídeo inexistente', async () => {
    // Simula que o vídeo não foi encontrado (retorna null)
    updateVideo.mockResolvedValue(null);

    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        id: 999,
        titulo: 'Vídeo Inexistente',
        url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        descricao: 'Descrição válida'
      },
      headers: { host: 'localhost:3000' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Vídeo não encontrado' });
  });
});