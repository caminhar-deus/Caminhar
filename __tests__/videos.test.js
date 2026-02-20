import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { createVideo, updateVideo } from '../lib/db.js';

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

describe('Funcionalidade de Descrição nos Vídeos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createVideo deve incluir o campo descricao no INSERT', async () => {
    const videoData = {
      titulo: 'Vídeo de Teste',
      url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      descricao: 'Esta é uma descrição de teste para validar o banco de dados.',
      publicado: false
    };

    // Simula o retorno do banco de dados
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, ...videoData }]
    });

    const result = await createVideo(videoData);

    // Verifica se a função query foi chamada com os parâmetros corretos (incluindo a descrição)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO videos'),
      expect.arrayContaining([
        videoData.titulo, 
        videoData.url_youtube, 
        videoData.descricao,
        videoData.publicado
      ])
    );
    
    expect(result).toEqual(expect.objectContaining({
      descricao: videoData.descricao
    }));
  });

  test('updateVideo deve incluir o campo descricao no UPDATE', async () => {
    const id = 1;
    const updateData = {
      titulo: 'Vídeo Atualizado',
      url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      descricao: 'Descrição atualizada com sucesso.',
      publicado: true
    };

    mockQuery.mockResolvedValueOnce({
      rows: [{ id, ...updateData }]
    });

    await updateVideo(id, updateData);

    // Verifica se a query SQL de update contém o campo descricao
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE videos'),
      expect.arrayContaining([
        updateData.titulo, 
        updateData.url_youtube, 
        updateData.descricao, 
        updateData.publicado,
        id
      ])
    );
  });

  test('createVideo deve salvar o status de publicado corretamente', async () => {
    const videoData = {
      titulo: 'Vídeo Rascunho',
      url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      descricao: 'Teste de rascunho',
      publicado: false
    };

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, ...videoData }]
    });

    const result = await createVideo(videoData);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO videos'),
      expect.arrayContaining([
        videoData.titulo,
        videoData.url_youtube,
        videoData.descricao,
        videoData.publicado
      ])
    );
    
    expect(result).toEqual(expect.objectContaining({
      publicado: false
    }));
  });

  test('updateVideo deve atualizar o status de publicado', async () => {
    const id = 1;
    const updateData = {
      titulo: 'Vídeo Publicado',
      url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      descricao: 'Agora publicado',
      publicado: true
    };

    mockQuery.mockResolvedValueOnce({
      rows: [{ id, ...updateData }]
    });

    await updateVideo(id, updateData);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE videos'),
      expect.arrayContaining([
        updateData.titulo,
        updateData.url_youtube,
        updateData.descricao,
        updateData.publicado,
        id
      ])
    );
  });
});