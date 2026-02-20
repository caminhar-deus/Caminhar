import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/admin/videos';
import { createVideo, getPaginatedVideos, deleteVideo } from '../lib/db';

// Mock do banco de dados
jest.mock('../lib/db', () => ({
  // Mock as funções que o handler realmente importa e usa
  createVideo: jest.fn(),
  getPaginatedVideos: jest.fn(),
  deleteVideo: jest.fn(),
}));

// Mock do módulo de autenticação para ignorar a verificação de token neste teste
jest.mock('../lib/auth', () => ({
  withAuth: (handler) => (req, res) => handler(req, res),
}));

describe('Integração: Fluxo Completo de Vídeos (API + DB)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve realizar o ciclo completo: criar, listar e excluir um vídeo', async () => {
    // =================================================================
    // PASSO 1: CRIAR VÍDEO (POST)
    // =================================================================
    const newVideo = {
      titulo: 'Vídeo de Integração',
      url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      descricao: 'Descrição teste fluxo completo'
    };

    const { req: createReq, res: createRes } = createMocks({
      method: 'POST',
      body: newVideo,
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do INSERT no banco
    createVideo.mockResolvedValueOnce({ id: 1, ...newVideo, created_at: new Date().toISOString() });

    await handler(createReq, createRes);

    // Verificações da Criação
    expect(createRes._getStatusCode()).toBe(201);
    const createdData = JSON.parse(createRes._getData());
    expect(createdData).toEqual(expect.objectContaining(newVideo));
    expect(createVideo).toHaveBeenCalledWith(expect.objectContaining({ titulo: newVideo.titulo }));

    // =================================================================
    // PASSO 2: LISTAR VÍDEOS (GET)
    // =================================================================
    const { req: listReq, res: listRes } = createMocks({
      method: 'GET',
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do SELECT no banco (retorna o vídeo criado)
    getPaginatedVideos.mockResolvedValueOnce({
      videos: [{ id: 1, ...newVideo, created_at: new Date().toISOString() }],
      pagination: { total: 1, totalPages: 1 }
    });

    await handler(listReq, listRes);

    // Verificações da Listagem
    expect(listRes._getStatusCode()).toBe(200);
    const listData = JSON.parse(listRes._getData());
    expect(Array.isArray(listData.videos)).toBe(true);
    expect(listData.videos[0].titulo).toBe(newVideo.titulo);
    expect(getPaginatedVideos).toHaveBeenCalled();

    // =================================================================
    // PASSO 3: EXCLUIR VÍDEO (DELETE)
    // =================================================================
    const { req: deleteReq, res: deleteRes } = createMocks({
      method: 'DELETE',
      body: { id: 1 },
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do DELETE no banco
    deleteVideo.mockResolvedValueOnce({ id: 1 });

    await handler(deleteReq, deleteRes);

    // Verificações da Exclusão
    expect(deleteRes._getStatusCode()).toBe(200);
    expect(JSON.parse(deleteRes._getData())).toEqual({ message: 'Vídeo excluído com sucesso' });
    expect(deleteVideo).toHaveBeenCalledWith(1);
  });

  it('deve filtrar vídeos por termo de busca', async () => {
    const searchTerm = 'Teste';
    const { req, res } = createMocks({
      method: 'GET',
      query: { search: searchTerm },
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do SELECT no banco (precisa de 2 mocks: dados e count)
    getPaginatedVideos.mockResolvedValueOnce({
      videos: [{ id: 1, titulo: 'Vídeo de Teste' }],
      pagination: { total: 1, totalPages: 1 }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    // Verifica se a query foi chamada com o filtro WHERE LIKE e o parâmetro correto
    expect(getPaginatedVideos).toHaveBeenCalledWith(
      expect.any(Number), // page
      expect.any(Number), // limit
      searchTerm
    );
  });
});