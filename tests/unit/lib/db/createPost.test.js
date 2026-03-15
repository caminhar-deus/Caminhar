import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockQuery } from 'pg';
import { createPost } from '../../../../lib/db.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

describe('createPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    // Define um retorno padrão para evitar erros de 'undefined' em chamadas não mockadas
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('deve criar um novo post com os dados corretos', async () => {
    const postData = {
      title: 'Novo Post',
      slug: 'novo-post',
      excerpt: 'Um resumo do post.',
      content: 'Conteúdo completo do post.',
      image_url: 'https://example.com/image.jpg',
      published: true,
    };

    const mockDbResponse = {
      id: 1,
      ...postData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockQuery.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await createPost(postData);

    // Verifica se a query foi chamada corretamente
    expect(mockQuery).toHaveBeenCalledTimes(1);
    
    const [text, values] = mockQuery.mock.calls[0];

    // Valida a query SQL
    expect(text).toContain('INSERT INTO posts');
    expect(text).toContain('VALUES ($1, $2, $3, $4, $5, $6)');

    // Valida os valores passados para a query
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

  it('deve lidar com valores nulos ou ausentes corretamente', async () => {
    const postData = {
      title: 'Post com campos nulos',
      slug: 'post-com-campos-nulos',
      content: 'Conteúdo.',
    };

    const mockDbResponse = { id: 2, ...postData };
    mockQuery.mockResolvedValue({ rows: [mockDbResponse] });

    await createPost(postData);

    const [, values] = mockQuery.mock.calls[0];

    // Verifica se os valores ausentes são tratados como null ou false
    expect(values).toEqual(['Post com campos nulos', 'post-com-campos-nulos', null, 'Conteúdo.', null, false]);
  });

  it('deve propagar erros do banco de dados', async () => {
    const dbError = new Error('Erro de inserção no DB');
    mockQuery.mockRejectedValue(dbError);

    // Silencia o console.error para este teste
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const postData = { title: 'Post que falha', slug: 'post-que-falha', content: '...' };

    await expect(createPost(postData)).rejects.toThrow('Erro de inserção no DB');

    // Verifica se o erro foi logado, sem poluir o console
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});