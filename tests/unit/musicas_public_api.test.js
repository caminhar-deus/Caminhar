import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/musicas';
import { getPaginatedMusicas } from '../../lib/domain/musicas.js';

// Mock da camada de domínio, que é a dependência direta do handler da API.
// Isso isola o teste do handler da implementação do banco de dados.
jest.mock('../../lib/domain/musicas.js', () => ({
  getPaginatedMusicas: jest.fn(),
}));

describe('API Pública de Músicas (/api/musicas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Fornece um mock padrão para evitar erros em testes que não dependem de dados específicos.
    getPaginatedMusicas.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
  });

  it('deve retornar lista de músicas publicadas com status 200', async () => {
    const mockMusicas = [
      { id: 1, titulo: 'Música 1', artista: 'Artista A', publicado: true },
      { id: 2, titulo: 'Música 2', artista: 'Artista B', publicado: true }
    ];

    // Simula o retorno da função de domínio
    getPaginatedMusicas.mockResolvedValue({
      data: mockMusicas,
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());

    // Verifica a estrutura da resposta padronizada
    expect(responseData.success).toBe(true);
    expect(responseData.data).toEqual(mockMusicas);
    expect(responseData.pagination).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 });

    // Verifica se a função de domínio foi chamada com os parâmetros corretos
    expect(getPaginatedMusicas).toHaveBeenCalledWith(
      1,    // page default
      10,   // limit default
      undefined, // search default
      true  // publishedOnly = true
    );
  });

  it('deve filtrar por termo de busca', async () => {
    const searchTerm = 'Hino';

    const { req, res } = createMocks({
      method: 'GET',
      query: { search: searchTerm }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getPaginatedMusicas).toHaveBeenCalledWith(
      1,
      10,
      searchTerm,
      true
    );
  });

  it('deve suportar paginação', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '3', limit: '5' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getPaginatedMusicas).toHaveBeenCalledWith(
      3,    // page
      5,    // limit
      undefined,
      true
    );
  });

  it('deve retornar erro 405 para métodos não permitidos (ex: POST)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData()).message).toContain('Method POST Not Allowed');
  });

  it('deve retornar erro 500 em caso de falha interna', async () => {
    // Silencia o console.error para este teste específico pois o erro é esperado
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    getPaginatedMusicas.mockRejectedValue(new Error('Erro de conexão com banco'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.message).toBe('Erro interno do servidor ao buscar músicas.');

    // Restaura o console.error original
    consoleSpy.mockRestore();
  });
});
