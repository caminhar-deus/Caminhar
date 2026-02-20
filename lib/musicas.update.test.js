import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { updateMusica } from './db.js';

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

describe('updateMusica (Atualização de Música)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query UPDATE com os parâmetros corretos', async () => {
    const musicaId = 5;
    const musicaData = {
      titulo: 'Canção Atualizada',
      artista: 'Artista Renovado',
      descricao: 'Descrição atualizada.',
      url_spotify: 'https://spotify.com/track/456',
      publicado: false,
    };

    // Mock do retorno do banco
    const mockDbResponse = {
      id: musicaId,
      ...musicaData,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockQuery.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await updateMusica(musicaId, musicaData);

    // Verifica se a query foi chamada
    expect(mockQuery).toHaveBeenCalledTimes(1);
    
    const [text, values] = mockQuery.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('UPDATE musicas');
    expect(text).toContain('SET titulo = $1, artista = $2, descricao = $3, url_spotify = $4, publicado = $5, updated_at = CURRENT_TIMESTAMP');
    expect(text).toContain('WHERE id = $6');
    expect(text).toContain('RETURNING *');

    // Valida os valores passados para a query (ordem importa)
    expect(values).toEqual([
      musicaData.titulo,
      musicaData.artista,
      musicaData.descricao,
      musicaData.url_spotify,
      musicaData.publicado,
      musicaId
    ]);

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});