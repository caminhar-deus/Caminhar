import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo de banco de dados
jest.mock('../../../../../lib/db.js', () => ({
  query: jest.fn(),
}));

import { createPost } from '../../../../../lib/posts.js';
import * as db from '../../../../../lib/db.js';

describe('createPost (Inserção de Post)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar a query INSERT com os parâmetros corretos', async () => {
    const postData = {
      title: 'Novo Post',
      slug: 'novo-post',
      excerpt: 'Um resumo do post.',
      content: 'Conteúdo completo do post.',
      image_url: 'https://example.com/image.jpg',
      published: true,
    };

    // Mock do retorno do banco
    const mockDbResponse = {
      id: 1,
      ...postData,
      created_at: new Date(),
      updated_at: new Date(),
    };
    db.query.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await createPost(postData);

    // Verifica se a query foi chamada
    expect(db.query).toHaveBeenCalledTimes(1);
    
    const [text, values] = db.query.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('INSERT INTO posts');
    expect(text).toContain('(title, slug, excerpt, content, image_url, published)');
    expect(text).toContain('VALUES ($1, $2, $3, $4, $5, $6)');
    expect(text).toContain('RETURNING *');

    // Valida os valores passados para a query (ordem importa)
    expect(values).toEqual([
      postData.title,
      postData.slug,
      postData.excerpt,
      postData.content,
      postData.image_url,
      postData.published
    ]);

    // Valida o retorno da função
    expect(result).toEqual(mockDbResponse);
  });
});