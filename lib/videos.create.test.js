import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo de banco de dados
jest.mock('./db.js', () => ({
  query: jest.fn(),
}));

import { createVideo } from './videos.js';
import * as db from './db.js';

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
    db.query.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await createVideo(videoData);

    // Verifica se a query foi chamada
    expect(db.query).toHaveBeenCalledTimes(1);
    
    const [text, values] = db.query.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('INSERT INTO videos');
    expect(text).toContain('(titulo, url_youtube, descricao, publicado, thumbnail)');
    expect(text).toContain('VALUES ($1, $2, $3, $4, $5)');
    expect(text).toContain('RETURNING *');

    // Valida os valores passados para a query (ordem importa)
    expect(values).toEqual([
      videoData.titulo,
      videoData.url_youtube,
      videoData.descricao,
      videoData.publicado,
      undefined
    ]);

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});