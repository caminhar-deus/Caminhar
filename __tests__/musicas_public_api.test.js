import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/musicas';
import { query } from '../lib/db';

// Mock do módulo db para não acessar o banco de dados real
jest.mock('../lib/db', () => ({
  query: jest.fn(),
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

    // Simula o retorno da query
    query.mockResolvedValue({ rows: mockMusicas });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockMusicas);
    expect(query).toHaveBeenCalledWith(
      'SELECT id, titulo, artista, url_spotify, descricao FROM musicas WHERE publicado = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [10, 0] // Default limit and offset
    );
  });

  it('deve filtrar por termo de busca', async () => {
    const searchTerm = 'Hino';
    query.mockResolvedValue({ rows: [] });

    const { req, res } = createMocks({
      method: 'GET',
      query: { search: searchTerm }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(query).toHaveBeenCalledWith(
      'SELECT id, titulo, artista, url_spotify, descricao FROM musicas WHERE publicado = true AND (titulo ILIKE $1 OR artista ILIKE $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [`%${searchTerm.toLowerCase()}%`, 10, 0]
    );
  });

  it('deve suportar paginação', async () => {
    query.mockResolvedValue({ rows: [] });

    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '3', limit: '5' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(query).toHaveBeenCalledWith(
      'SELECT id, titulo, artista, url_spotify, descricao FROM musicas WHERE publicado = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [5, 10] // limit 5, offset (3-1)*5 = 10
    );
  });

  it('deve retornar erro 405 para métodos não permitidos (ex: POST)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Method POST Not Allowed' });
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
    expect(data.message).toBe('Erro interno do servidor ao buscar músicas.');
    expect(data.details).toBe('Erro de conexão com banco');

    // Restaura o console.error original
    consoleSpy.mockRestore();
  });
});
