import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo de banco de dados
jest.mock('./db.js', () => ({
  query: jest.fn(),
}));

import { updateVideo } from './videos.js';
import * as db from './db.js';

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
    db.query.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await updateVideo(videoId, videoData);

    // Verifica se a query foi chamada
    expect(db.query).toHaveBeenCalledTimes(1);
    
    const [text, values] = db.query.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('UPDATE videos');
    expect(text).toContain('SET titulo = $1, url_youtube = $2, descricao = $3, publicado = $4, thumbnail = $5, updated_at = CURRENT_TIMESTAMP');
    expect(text).toContain('WHERE id = $6');
    expect(text).toContain('RETURNING *');

    // Valida os valores passados para a query (ordem importa)
    expect(values).toEqual([
      videoData.titulo,
      videoData.url_youtube,
      videoData.descricao,
      videoData.publicado,
      undefined,
      videoId
    ]);

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});