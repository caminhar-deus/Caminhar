import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/admin/musicas';
import { createMusica, getPaginatedMusicas, deleteMusica } from '../lib/db';

// Mock do banco de dados
jest.mock('../lib/db', () => ({
  createMusica: jest.fn(),
  getPaginatedMusicas: jest.fn(),
  deleteMusica: jest.fn(),
}));

// Mock do módulo de autenticação para ignorar a verificação de token neste teste
jest.mock('../lib/auth', () => ({
  withAuth: (handler) => (req, res) => handler(req, res),
}));

describe('Integração: Fluxo Completo de Músicas (API + DB)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve realizar o ciclo completo: criar, listar e excluir uma música', async () => {
    // =================================================================
    // PASSO 1: CRIAR MÚSICA (POST)
    // =================================================================
    const newMusica = {
      titulo: 'Música de Teste',
      artista: 'Artista Teste',
      descricao: 'Descrição teste',
      url_spotify: 'https://open.spotify.com/track/123456789',
      publicado: false
    };

    const { req: createReq, res: createRes } = createMocks({
      method: 'POST',
      body: newMusica,
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do INSERT no banco
    createMusica.mockResolvedValueOnce({ id: 1, ...newMusica, created_at: new Date().toISOString() });

    await handler(createReq, createRes);

    // Verificações da Criação
    expect(createRes._getStatusCode()).toBe(201);
    const createdData = JSON.parse(createRes._getData());
    expect(createdData).toEqual(expect.objectContaining(newMusica));
    expect(createMusica).toHaveBeenCalledWith(expect.objectContaining({ titulo: newMusica.titulo }));

    // =================================================================
    // PASSO 2: LISTAR MÚSICAS (GET)
    // =================================================================
    const { req: listReq, res: listRes } = createMocks({
      method: 'GET',
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do SELECT no banco
    getPaginatedMusicas.mockResolvedValueOnce({
      musicas: [{ id: 1, ...newMusica, created_at: new Date().toISOString() }],
      pagination: { total: 1, totalPages: 1 }
    });

    await handler(listReq, listRes);

    // Verificações da Listagem
    expect(listRes._getStatusCode()).toBe(200);
    const listData = JSON.parse(listRes._getData());
    expect(Array.isArray(listData.musicas)).toBe(true);
    expect(listData.musicas[0].titulo).toBe(newMusica.titulo);
    expect(getPaginatedMusicas).toHaveBeenCalled();

    // =================================================================
    // PASSO 3: EXCLUIR MÚSICA (DELETE)
    // =================================================================
    const { req: deleteReq, res: deleteRes } = createMocks({
      method: 'DELETE',
      body: { id: 1 },
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do DELETE no banco
    deleteMusica.mockResolvedValueOnce({ id: 1 });

    await handler(deleteReq, deleteRes);

    // Verificações da Exclusão
    expect(deleteRes._getStatusCode()).toBe(200);
    expect(JSON.parse(deleteRes._getData())).toEqual({ message: 'Música excluída com sucesso' });
    expect(deleteMusica).toHaveBeenCalledWith(1);
  });

  it('deve retornar erro 400 se a URL do Spotify for inválida', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        titulo: 'Teste Inválido',
        artista: 'Teste',
        url_spotify: 'https://youtube.com/watch?v=123' // URL inválida
      }
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toMatch(/URL do Spotify inválida/);
  });

  it('deve filtrar músicas por termo de busca', async () => {
    const searchTerm = 'Teste';
    const { req, res } = createMocks({
      method: 'GET',
      query: { search: searchTerm },
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do SELECT no banco
    getPaginatedMusicas.mockResolvedValueOnce({
      musicas: [{ id: 1, titulo: 'Música de Teste' }],
      pagination: { total: 1, totalPages: 1 }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    // Verifica se a query foi chamada com o filtro WHERE LIKE e o parâmetro correto
    expect(getPaginatedMusicas).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      searchTerm
    );
  });
});