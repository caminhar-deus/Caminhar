import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/admin/musicas';
import { query } from '../lib/db';

// Mock do banco de dados
jest.mock('../lib/db', () => ({
  query: jest.fn(),
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
      url_imagem: 'https://exemplo.com/capa.jpg',
      url_spotify: 'https://open.spotify.com/track/123456789',
      publicado: false
    };

    const { req: createReq, res: createRes } = createMocks({
      method: 'POST',
      body: newMusica,
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do INSERT no banco
    query.mockResolvedValueOnce({
      rows: [{ id: 1, ...newMusica, created_at: new Date().toISOString() }]
    });

    await handler(createReq, createRes);

    // Verificações da Criação
    expect(createRes._getStatusCode()).toBe(201);
    const createdData = JSON.parse(createRes._getData());
    expect(createdData).toEqual(expect.objectContaining(newMusica));
    
    // Verifica se o SQL de INSERT foi gerado corretamente
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO musicas'),
      expect.arrayContaining([
        newMusica.titulo, 
        newMusica.artista, 
        newMusica.url_imagem, 
        newMusica.url_spotify,
        newMusica.publicado
      ])
    );

    // =================================================================
    // PASSO 2: LISTAR MÚSICAS (GET)
    // =================================================================
    const { req: listReq, res: listRes } = createMocks({
      method: 'GET',
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do SELECT no banco
    query.mockResolvedValueOnce({
      rows: [{ id: 1, ...newMusica, created_at: new Date().toISOString() }]
    });

    await handler(listReq, listRes);

    // Verificações da Listagem
    expect(listRes._getStatusCode()).toBe(200);
    const listData = JSON.parse(listRes._getData());
    expect(Array.isArray(listData)).toBe(true);
    expect(listData[0].titulo).toBe(newMusica.titulo);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM musicas'),
      expect.anything() // params (pode ser undefined ou array vazio dependendo da implementação)
    );

    // =================================================================
    // PASSO 3: EXCLUIR MÚSICA (DELETE)
    // =================================================================
    const { req: deleteReq, res: deleteRes } = createMocks({
      method: 'DELETE',
      body: { id: 1 },
      headers: { host: 'localhost:3000' }
    });

    // Mock do retorno do DELETE no banco
    query.mockResolvedValueOnce({
      rows: [{ id: 1 }]
    });

    await handler(deleteReq, deleteRes);

    // Verificações da Exclusão
    expect(deleteRes._getStatusCode()).toBe(200);
    expect(JSON.parse(deleteRes._getData())).toEqual({ message: 'Música excluída com sucesso' });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM musicas'),
      expect.arrayContaining([1])
    );
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
    query.mockResolvedValueOnce({
      rows: [{ 
        id: 1, 
        titulo: 'Música de Teste', 
        artista: 'Artista Teste', 
        url_spotify: 'https://open.spotify.com/track/123',
        created_at: new Date().toISOString() 
      }]
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    // Verifica se a query foi chamada com o filtro WHERE LIKE e o parâmetro correto
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE LOWER(titulo) LIKE $1 OR LOWER(artista) LIKE $1'),
      expect.arrayContaining([`%${searchTerm.toLowerCase()}%`])
    );
  });
});