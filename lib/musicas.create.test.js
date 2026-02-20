import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { createMusica } from './db.js';

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

describe('createMusica (Inserção de Música)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query INSERT com os parâmetros corretos', async () => {
    const musicaData = {
      titulo: 'Nova Canção',
      artista: 'Artista Teste',
      descricao: 'Descrição da música teste',
      url_spotify: 'https://spotify.com/track/123',
      publicado: true,
    };

    // Mock do retorno do banco
    const mockDbResponse = {
      id: 1,
      ...musicaData,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockQuery.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await createMusica(musicaData);

    // Verifica se a query foi chamada
    expect(mockQuery).toHaveBeenCalledTimes(1);

    // Valida a query SQL e parâmetros
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO musicas'),
      expect.arrayContaining([
        musicaData.titulo,
        musicaData.artista,
        musicaData.descricao,
        musicaData.url_spotify,
        musicaData.publicado
      ])
    );

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});