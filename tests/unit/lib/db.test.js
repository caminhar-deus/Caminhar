import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// Mock do módulo 'pg' definido antes dos imports para evitar erro de referência (hoisting)
jest.mock('pg', () => ({
  Pool: jest.fn(() => {
    const mQuery = jest.fn();
    const mEnd = jest.fn();
    return {
      query: mQuery,
      end: mEnd,
      on: jest.fn(),
    };
  }),
}));

import { Pool } from 'pg';
import { getPaginatedMusicas } from '../../../lib/db.js';

describe('getPaginatedMusicas', () => {
  let mockQuery;

  beforeAll(() => {
    // Captura a referência do mockQuery da instância criada no db.js
    // Como db.js é importado, o Pool já foi instanciado uma vez.
    mockQuery = Pool.mock.results[0].value.query;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar músicas paginadas com parâmetros padrão', async () => {
    // Mock das respostas do banco de dados
    // 1ª chamada: Retorna as músicas (array vazio ou com dados)
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Música 1' }] });
    // 2ª chamada: Retorna a contagem total
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const result = await getPaginatedMusicas();

    // Verifica se a query foi chamada duas vezes (dados e contagem)
    expect(mockQuery).toHaveBeenCalledTimes(2);

    // Verificações da primeira query (SELECT dados)
    const firstCallArgs = mockQuery.mock.calls[0];
    const sqlData = firstCallArgs[0];
    const paramsData = firstCallArgs[1];

    expect(sqlData).toContain('SELECT * FROM musicas');
    // Verifica se a query padrão não tem WHERE e usa os placeholders corretos para paginação
    expect(sqlData).toContain('ORDER BY created_at DESC LIMIT $1 OFFSET $2');
    expect(paramsData).toEqual([10, 0]); // limit=10, offset=0 (padrão)

    // Verificações da segunda query (SELECT COUNT)
    const secondCallArgs = mockQuery.mock.calls[1];
    const sqlCount = secondCallArgs[0];
    const paramsCount = secondCallArgs[1];

    expect(sqlCount).toContain('SELECT COUNT(*) FROM musicas');
    expect(paramsCount).toEqual([]);

    // Verifica o formato do objeto de retorno
    expect(result).toEqual({
      musicas: [{ id: 1, title: 'Música 1' }],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('deve lidar corretamente com o parâmetro de busca', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await getPaginatedMusicas(1, 10, 'Teste');

    const firstCallArgs = mockQuery.mock.calls[0];
    const sqlData = firstCallArgs[0];
    const paramsData = firstCallArgs[1];

    // Verifica a construção do SQL com WHERE e placeholders dinâmicos
    expect(sqlData).toContain('WHERE (LOWER(titulo) LIKE $1 OR LOWER(artista) LIKE $1)');
    expect(sqlData).toContain('ORDER BY created_at DESC LIMIT $2 OFFSET $3');
    
    // Verifica os parâmetros (termo de busca, limit, offset)
    expect(paramsData).toEqual(['%teste%', 10, 0]);

    const secondCallArgs = mockQuery.mock.calls[1];
    const sqlCount = secondCallArgs[0];
    const paramsCount = secondCallArgs[1];

    expect(sqlCount).toContain('WHERE (LOWER(titulo) LIKE $1 OR LOWER(artista) LIKE $1)');
    expect(paramsCount).toEqual(['%teste%']);
  });

  it('deve calcular o offset corretamente para a página 2', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await getPaginatedMusicas(2, 5);

    const firstCallArgs = mockQuery.mock.calls[0];
    const paramsData = firstCallArgs[1];

    // limit=5, offset=5 (página 2)
    expect(paramsData).toEqual([5, 5]);
  });
});