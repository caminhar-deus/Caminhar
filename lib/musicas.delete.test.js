import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { deleteMusica } from './db.js';

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

describe('deleteMusica (Exclusão de Música)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query DELETE com o ID correto', async () => {
    const musicaId = 10;

    // Mock do retorno do banco
    const mockDbResponse = {
      id: musicaId,
    };
    mockQuery.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await deleteMusica(musicaId);

    // Verifica se a query foi chamada
    expect(mockQuery).toHaveBeenCalledTimes(1);
    
    // Valida a query SQL e parâmetros
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM musicas'),
      expect.arrayContaining([musicaId])
    );

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});