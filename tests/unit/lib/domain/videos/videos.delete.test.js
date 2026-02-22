import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { deleteVideo } from '../../../../../lib/db.js';

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

describe('deleteVideo (Exclusão de Vídeo)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query DELETE com o ID correto', async () => {
    const videoId = 20;

    // Mock do retorno do banco
    const mockDbResponse = {
      id: videoId,
    };
    mockQuery.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await deleteVideo(videoId);

    // Verifica se a query foi chamada
    expect(mockQuery).toHaveBeenCalledTimes(1);
    
    // Valida a query SQL e parâmetros
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM videos'),
      expect.arrayContaining([videoId])
    );

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});