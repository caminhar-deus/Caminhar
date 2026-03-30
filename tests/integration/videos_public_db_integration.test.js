import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/videos.js';
import { query } from '../../lib/db.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache.js';

// Mock do banco de dados (simulando a camada mais baixa)
jest.mock('../../lib/db', () => ({
  query: jest.fn(),
}));

// Mock da camada de cache para evitar o carregamento do 'redis' e o erro de ESM.
jest.mock('../../lib/cache.js', () => ({
  getOrSetCache: jest.fn(async (key, fetchFunction) => {
    return await fetchFunction();
  }),
  checkRateLimit: jest.fn().mockResolvedValue(false),
}));

describe('Integração API Pública: Validação de Segurança (Banco de Dados) - Vídeos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Define um mock de implementação padrão que cobre as duas chamadas (dados e contagem)
    // feitas por getPaginatedVideos, evitando o TypeError que causa o erro 500.
    query.mockImplementation((sql) => {
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '0' }] });
      }
      return Promise.resolve({ rows: [] });
    });
    checkRateLimit.mockResolvedValue(false);
    getOrSetCache.mockImplementation(async (key, fetchFunction) => {
      return await fetchFunction();
    });
  });

  it('deve garantir que a query SQL inclua "WHERE publicado = true"', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    // Verifica se a query enviada ao banco realmente contém o filtro de segurança
    const dataCall = query.mock.calls.find(call => call[0].includes('SELECT *'));
    const countCall = query.mock.calls.find(call => call[0].includes('COUNT(*)'));
    expect(dataCall[0]).toContain('WHERE publicado = true');
    expect(countCall[0]).toContain('WHERE publicado = true');
  });

  it('deve manter o filtro "publicado = true" mesmo quando houver busca', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { search: 'Culto' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    // Verifica se ambos os filtros estão presentes na query (segurança + busca)
    const dataCall = query.mock.calls.find(call => call[0].includes('SELECT *'));
    expect(dataCall[0]).toContain('WHERE publicado = true AND');
    expect(dataCall[1]).toEqual(expect.arrayContaining(['%culto%']));
  });
});