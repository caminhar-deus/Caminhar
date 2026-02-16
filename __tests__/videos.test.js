import { createVideo, updateVideo } from '../lib/videos';
import { query } from '../lib/db';

// Mock do módulo de banco de dados para não precisar de um banco real rodando
jest.mock('../lib/db', () => ({
  query: jest.fn(),
}));

describe('Funcionalidade de Descrição nos Vídeos', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('createVideo deve incluir o campo descricao no INSERT', async () => {
    const videoData = {
      titulo: 'Vídeo de Teste',
      url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      descricao: 'Esta é uma descrição de teste para validar o banco de dados.',
      thumbnail: '/uploads/thumb-teste.jpg'
    };

    // Simula o retorno do banco de dados
    query.mockResolvedValueOnce({
      rows: [{ id: 1, ...videoData }]
    });

    const result = await createVideo(videoData);

    // Verifica se a função query foi chamada com os parâmetros corretos (incluindo a descrição)
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO videos'),
      expect.arrayContaining([
        videoData.titulo, 
        videoData.url_youtube, 
        videoData.descricao, // O ponto crucial: verifica se a descrição foi passada para a query
        videoData.thumbnail
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
      thumbnail: '/uploads/thumb-updated.jpg'
    };

    query.mockResolvedValueOnce({
      rows: [{ id, ...updateData }]
    });

    await updateVideo(id, updateData);

    // Verifica se a query SQL de update contém o campo descricao
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE videos'),
      expect.arrayContaining([
        updateData.titulo, 
        updateData.url_youtube, 
        updateData.descricao, 
        updateData.thumbnail,
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

    query.mockResolvedValueOnce({
      rows: [{ id: 1, ...videoData }]
    });

    const result = await createVideo(videoData);

    expect(query).toHaveBeenCalledWith(
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

    query.mockResolvedValueOnce({
      rows: [{ id, ...updateData }]
    });

    await updateVideo(id, updateData);

    expect(query).toHaveBeenCalledWith(
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