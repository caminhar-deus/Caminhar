import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/musicas';
import { query } from '../../../lib/infra/db.js';
import { INVALID_PARAMS_MESSAGE } from '../../../lib/api/helpers.js';

// Mock do banco de dados (simulando a camada mais baixa)
jest.mock('../../../lib/infra/db', () => ({
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

  it('deve garantir que a query SQL inclua "WHERE published = true"', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    // Verifica se a query enviada ao banco realmente contém o filtro de segurança
    const dataCall = query.mock.calls.find(call => call[0].includes('FROM musicas') && call[0].includes('LIMIT'));
    const countCall = query.mock.calls.find(call => call[0].includes('COUNT(*)'));
    expect(dataCall[0]).toContain('WHERE published = true');
    expect(countCall[0]).toContain('WHERE published = true');
  });

  it('deve manter o filtro "published = true" mesmo quando houver busca', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { search: 'Hino' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    // Verifica se ambos os filtros estão presentes na query (segurança + busca)
    const dataCall = query.mock.calls.find(call => call[0].includes('FROM musicas') && call[0].includes('LIMIT'));
    expect(dataCall[0]).toContain('WHERE published = true AND');
    expect(dataCall[1]).toEqual(expect.arrayContaining(['%hino%']));
  });

  it.each([
    ['default', 'ORDER BY created_at DESC, id DESC'],
    ['positioned', 'ORDER BY position ASC, id ASC'],
    ['oldest', 'ORDER BY created_at ASC, id ASC'],
    ['alpha', 'ORDER BY lower(unaccent(titulo)) ASC, id ASC'],
    ['alpha_desc', 'ORDER BY lower(unaccent(titulo)) DESC, id DESC'],
  ])('deve propagar sort=%s da rota até o SQL real com desempate determinístico', async (sort, expectedOrder) => {
    const { req, res } = createMocks({
      method: 'GET',
      // limit único por caso para isolar chaves do cache em memória do módulo
      query: { sort, page: '1', limit: '12', search: `filtro-${sort}` },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const dataCall = query.mock.calls.find(call => call[0].includes('FROM musicas') && call[0].includes('LIMIT'));
    const normalizedSql = dataCall[0].replace(/\s+/g, ' ').trim();
    expect(normalizedSql).toContain('WHERE published = true');
    expect(normalizedSql).toContain(expectedOrder);
  });

  it('deve rejeitar sort inválido com 400 Bad Request sem tocar no banco', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { sort: 'titulo_cru' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toMatchObject({
      error: 'Bad Request',
      message: INVALID_PARAMS_MESSAGE,
    });
    expect(query).not.toHaveBeenCalled();
  });
});