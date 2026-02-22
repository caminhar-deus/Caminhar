import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo de banco de dados
jest.mock('../../../../../lib/db.js', () => ({
  query: jest.fn(),
}));

import { deletePost } from '../../../../../lib/posts.js';
import * as db from '../../../../../lib/db.js';

describe('deletePost (Exclusão de Post)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query DELETE com o ID correto', async () => {
    const postId = 10;

    // Mock do retorno do banco
    const mockDbResponse = {
      id: postId,
    };
    db.query.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await deletePost(postId);

    // Verifica se a query foi chamada
    expect(db.query).toHaveBeenCalledTimes(1);
    
    const [text, values] = db.query.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('DELETE FROM posts');
    expect(text).toContain('WHERE id = $1');
    expect(text).toContain('RETURNING id');

    // Valida os valores passados para a query
    expect(values).toEqual([postId]);

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});