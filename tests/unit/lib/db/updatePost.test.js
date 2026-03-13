import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { updatePost } from '../../../../lib/db.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

describe('updatePost', () => {
  let mockQuery;

  beforeEach(() => {
    mockQuery = new Pool().query;
    mockQuery.mockReset();
  });

  it('deve atualizar um post existente com os parâmetros corretos', async () => {
    const postId = 1;
    const postData = {
      title: 'Título Atualizado',
      slug: 'titulo-atualizado',
      excerpt: 'Resumo atualizado',
      content: 'Conteúdo atualizado',
      image_url: 'https://example.com/updated.jpg',
      published: true,
    };

    const mockDbResponse = {
      id: postId,
      ...postData,
      updated_at: new Date().toISOString(),
    };

    // Simula o retorno do banco (RETURNING *)
    mockQuery.mockResolvedValue({ rows: [mockDbResponse] });

    const result = await updatePost(postId, postData);

    // Verifica se a query foi chamada corretamente
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [text, values] = mockQuery.mock.calls[0];

    expect(text).toContain('UPDATE posts');
    expect(text).toContain('WHERE id = $7');
    
    // Verifica a ordem e valores dos parâmetros ($1 a $7)
    expect(values).toEqual([
      postData.title,
      postData.slug,
      postData.excerpt,
      postData.content,
      postData.image_url,
      postData.published,
      postId
    ]);

    expect(result).toEqual(mockDbResponse);
  });

  it('deve lidar com campos opcionais nulos (ex: excerpt, image_url)', async () => {
    const postId = 2;
    const postData = {
      title: 'Post Mínimo',
      slug: 'post-minimo',
      content: 'Apenas conteúdo',
      // excerpt, image_url e published omitidos
    };

    mockQuery.mockResolvedValue({ rows: [{ id: postId, ...postData }] });

    await updatePost(postId, postData);

    const [, values] = mockQuery.mock.calls[0];
    // Verifica se undefined vira null ou false (padrão do db.js)
    // $3 (excerpt) -> null, $5 (image_url) -> null, $6 (published) -> false
    expect(values).toEqual([
      postData.title,
      postData.slug,
      null, 
      postData.content,
      null, 
      false, 
      postId
    ]);
  });

  it('deve propagar erros do banco de dados', async () => {
    const dbError = new Error('Database connection failed');
    mockQuery.mockRejectedValue(dbError);

    // Silencia o console.error para este teste
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(updatePost(1, {})).rejects.toThrow('Database connection failed');

    // Verifica se o erro foi logado, sem poluir o console
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});