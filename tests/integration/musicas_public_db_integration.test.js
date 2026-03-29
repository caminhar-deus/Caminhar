import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/musicas';
import { query } from '../../lib/db.js';

// Mock do banco de dados (simulando a camada mais baixa)
jest.mock('../../lib/db', () => ({
  query: jest.fn(),
}));

describe('Integração API Pública: Validação de Segurança (Banco de Dados)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Define um mock de implementação padrão que cobre as duas chamadas (dados e contagem)
    // feitas por getPaginatedMusicas, evitando o TypeError que causa o erro 500.
    query.mockImplementation((sql) => {
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '0' }] });
      }
      return Promise.resolve({ rows: [] });
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
      query: { search: 'Hino' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    // Verifica se ambos os filtros estão presentes na query (segurança + busca)
    const dataCall = query.mock.calls.find(call => call[0].includes('SELECT *'));
    expect(dataCall[0]).toContain('WHERE publicado = true AND');
    expect(dataCall[1]).toEqual(expect.arrayContaining(['%hino%']));
  });
});