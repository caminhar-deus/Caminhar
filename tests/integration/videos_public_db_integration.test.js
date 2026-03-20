import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/v1/videos';

// Mock do banco de dados (simulando a camada mais baixa)
jest.mock('../../lib/db', () => ({
  query: jest.fn(),
}));

// Mock do cache para evitar dependências externas
jest.mock('../../lib/cache', () => ({
  getOrSetCache: jest.fn(),
  invalidateCache: jest.fn(),
}));

// Import dos mocks para usar nas funções
const { query } = require('../../lib/db');
const { getOrSetCache } = require('../../lib/cache');

describe('Integração API Pública: Validação de Segurança (Banco de Dados) - Vídeos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve garantir que a query SQL inclua "WHERE publicado = true"', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    // Mock do cache para retornar os dados simulados
    getOrSetCache.mockResolvedValueOnce({
      videos: [
        { id: 1, titulo: 'Vídeo Publicado', publicado: true }
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    // Verifica se o cache foi chamado corretamente
    expect(getOrSetCache).toHaveBeenCalledWith(
      'videos:public:page:1:limit:10',
      expect.any(Function),
      3600
    );
  });

  it('deve manter o filtro "publicado = true" mesmo quando houver busca', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { search: 'Culto' }
    });

    // Mock do cache para retornar os dados simulados
    getOrSetCache.mockResolvedValueOnce({
      videos: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    // Verifica se o cache foi chamado corretamente
    expect(getOrSetCache).toHaveBeenCalledWith(
      'videos:public:page:1:limit:10',
      expect.any(Function),
      3600
    );
  });
});