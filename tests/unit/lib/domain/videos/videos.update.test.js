import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { updateVideo } from '../../../../../lib/db.js';

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

describe('updateVideo (Atualização de Vídeo)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query UPDATE com os parâmetros corretos', async () => {
    const videoId = 15;
    const videoData = {
      titulo: 'Vídeo Atualizado',
      url_youtube: 'https://youtu.be/new-video',
      descricao: 'Descrição foi atualizada.',
      publicado: false,
    };

    // Mock do retorno do banco
    const mockDbResponse = {
      id: videoId,
      ...videoData,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockQuery.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await updateVideo(videoId, videoData);

    // Verifica se a query foi chamada
    expect(mockQuery).toHaveBeenCalledTimes(1);
    
    const [text, values] = mockQuery.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('UPDATE videos');
    expect(text).toContain('SET titulo = $1, url_youtube = $2, descricao = $3, publicado = $4, updated_at = CURRENT_TIMESTAMP');
    expect(text).toContain('WHERE id = $5');
    expect(text).toContain('RETURNING *');

    // Valida os valores passados para a query (ordem importa)
    expect(values).toEqual([
      videoData.titulo,
      videoData.url_youtube,
      videoData.descricao,
      videoData.publicado,
      videoId
    ]);

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});