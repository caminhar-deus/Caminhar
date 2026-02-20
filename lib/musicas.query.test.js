import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { getPaginatedMusicas } from './db.js';

// Mock do módulo 'pg'
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mPool),
  };
});

// Captura a função 'query' do mock da instância do Pool
const mockQuery = Pool.mock.results[0].value.query;

describe('getPaginatedMusicas (Query SQL)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve gerar a query SQL com LIMIT e OFFSET corretos para a primeira página', async () => {
    // Mock dos retornos (getPaginatedMusicas executa duas queries em paralelo via Promise.all)
    // A ordem no array do Promise.all é [query dados, query contagem]
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Query de dados
      .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // Query de contagem

    const page = 1;
    const limit = 10;
    
    await getPaginatedMusicas(page, limit);

    // Encontra a chamada correspondente à query de seleção de dados
    const calls = mockQuery.mock.calls;
    const dataQueryCall = calls.find(call => call[0].includes('SELECT * FROM musicas'));
    
    expect(dataQueryCall).toBeDefined();
    const [text, values] = dataQueryCall;

    // Verifica a estrutura da query
    expect(text).toContain('ORDER BY created_at DESC');
    expect(text).toContain('LIMIT $1');
    expect(text).toContain('OFFSET $2');

    // Verifica os valores passados (LIMIT = 10, OFFSET = 0)
    expect(values[0]).toBe(limit);
    expect(values[1]).toBe(0);
  });

  it('deve calcular o OFFSET corretamente para páginas subsequentes', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const page = 3;
    const limit = 20;
    
    await getPaginatedMusicas(page, limit);

    const calls = mockQuery.mock.calls;
    const dataQueryCall = calls.find(call => call[0].includes('SELECT * FROM musicas'));
    const [text, values] = dataQueryCall;

    // Offset = (3 - 1) * 20 = 40
    expect(values[0]).toBe(limit);
    expect(values[1]).toBe(40);
  });

  it('deve incluir cláusula WHERE e parâmetro de busca quando fornecido', async () => {
    // Mock que satisfaz tanto a query de dados quanto a de contagem (que espera rows[0].count)
    mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

    const search = 'Louvor';
    await getPaginatedMusicas(1, 10, search);

    const calls = mockQuery.mock.calls;
    const dataQueryCall = calls.find(call => call[0].includes('SELECT * FROM musicas'));
    const [text, values] = dataQueryCall;

    expect(text).toContain('WHERE (LOWER(titulo) LIKE $3 OR LOWER(artista) LIKE $3)');
    expect(values[2]).toBe('%louvor%');
  });
});