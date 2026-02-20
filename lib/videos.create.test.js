import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { createVideo } from './db.js';

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

describe('createVideo (Inserção de Vídeo)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query INSERT com os parâmetros corretos', async () => {
    const videoData = {
      titulo: 'Novo Vídeo de Teste',
      url_youtube: 'https://youtu.be/test12345',
      descricao: 'Uma descrição completa para o vídeo.',
      publicado: true,
    };

    // Mock do retorno do banco
    const mockDbResponse = {
      id: 10,
      ...videoData,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockQuery.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await createVideo(videoData);

    // Verifica se a query foi chamada
    expect(mockQuery).toHaveBeenCalledTimes(1);

    // Valida a query SQL e parâmetros
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO videos'),
      expect.arrayContaining([
        videoData.titulo,
        videoData.url_youtube,
        videoData.descricao,
        videoData.publicado
      ])
    );

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});