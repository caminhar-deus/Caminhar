import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo de banco de dados
jest.mock('./db.js', () => ({
  query: jest.fn(),
}));

import { createMusica } from './musicas.js';
import * as db from './db.js';

describe('createMusica (Inserção de Música)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query INSERT com os parâmetros corretos', async () => {
    const musicaData = {
      titulo: 'Nova Canção',
      artista: 'Artista Teste',
      url_imagem: 'https://example.com/image.jpg',
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
    db.query.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await createMusica(musicaData);

    // Verifica se a query foi chamada
    expect(db.query).toHaveBeenCalledTimes(1);
    
    const [text, values] = db.query.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('INSERT INTO musicas');
    expect(text).toContain('(titulo, artista, url_imagem, url_spotify, publicado)');
    expect(text).toContain('VALUES ($1, $2, $3, $4, $5)');
    expect(text).toContain('RETURNING *');

    // Valida os valores passados para a query (ordem importa)
    expect(values).toEqual([
      musicaData.titulo,
      musicaData.artista,
      musicaData.url_imagem,
      musicaData.url_spotify,
      musicaData.publicado
    ]);

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});