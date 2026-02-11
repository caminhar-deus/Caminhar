import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo de banco de dados
jest.mock('./db.js', () => ({
  query: jest.fn(),
}));

import { deleteMusica } from './musicas.js';
import * as db from './db.js';

describe('deleteMusica (Exclusão de Música)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query DELETE com o ID correto', async () => {
    const musicaId = 10;

    // Mock do retorno do banco
    const mockDbResponse = {
      id: musicaId,
    };
    db.query.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await deleteMusica(musicaId);

    // Verifica se a query foi chamada
    expect(db.query).toHaveBeenCalledTimes(1);
    
    const [text, values] = db.query.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('DELETE FROM musicas');
    expect(text).toContain('WHERE id = $1');
    expect(text).toContain('RETURNING id');

    // Valida os valores passados para a query
    expect(values).toEqual([musicaId]);

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});