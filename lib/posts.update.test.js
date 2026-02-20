import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo de banco de dados
jest.mock('./db.js', () => ({
  query: jest.fn(),
}));

import { updatePost } from './posts.js';
import * as db from './db.js';

describe('updatePost (Atualização de Post)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query UPDATE com os parâmetros corretos', async () => {
    const postId = 1;
    const postData = {
      title: 'Post Atualizado',
      slug: 'post-atualizado',
      excerpt: 'Resumo atualizado.',
      content: 'Conteúdo atualizado.',
      image_url: 'https://example.com/new.jpg',
      published: false,
    };

    // Mock do retorno do banco
    const mockDbResponse = {
      id: postId,
      ...postData,
      created_at: new Date(),
      updated_at: new Date(),
    };
    db.query.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await updatePost(postId, postData);

    // Verifica se a query foi chamada
    expect(db.query).toHaveBeenCalledTimes(1);
    
    const [text, values] = db.query.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('UPDATE posts');
    expect(text).toContain('SET title = $1, slug = $2, excerpt = $3, content = $4, image_url = $5, published = $6, updated_at = CURRENT_TIMESTAMP');
    expect(text).toContain('WHERE id = $7');
    expect(text).toContain('RETURNING *');

    // Valida os valores passados para a query (ordem importa)
    expect(values).toEqual([
      postData.title,
      postData.slug,
      postData.excerpt,
      postData.content,
      postData.image_url,
      postData.published,
      postId
    ]);

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});