import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo de banco de dados
jest.mock('./db.js', () => ({
  query: jest.fn(),
}));

import { updateMusica } from './musicas.js';
import * as db from './db.js';

describe('updateMusica (Atualização de Música)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query UPDATE com os parâmetros corretos', async () => {
    const musicaId = 5;
    const musicaData = {
      titulo: 'Canção Atualizada',
      artista: 'Artista Renovado',
      url_imagem: 'https://example.com/image-updated.jpg',
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
    db.query.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await updateMusica(musicaId, musicaData);

    // Verifica se a query foi chamada
    expect(db.query).toHaveBeenCalledTimes(1);
    
    const [text, values] = db.query.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('UPDATE musicas');
    expect(text).toContain('SET titulo = $1, artista = $2, url_imagem = $3, url_spotify = $4, publicado = $5, updated_at = CURRENT_TIMESTAMP');
    expect(text).toContain('WHERE id = $6');
    expect(text).toContain('RETURNING *');

    // Valida os valores passados para a query (ordem importa)
    expect(values).toEqual([
      musicaData.titulo,
      musicaData.artista,
      musicaData.url_imagem,
      musicaData.url_spotify,
      musicaData.publicado,
      musicaId
    ]);

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});