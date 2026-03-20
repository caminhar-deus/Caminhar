import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockQuery } from 'pg';
import { deletePost } from '../../../../lib/db.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

describe('deletePost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    // Define um retorno padrão para evitar erros de 'undefined' em chamadas não mockadas
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('deve deletar um post pelo ID e retornar o ID removido', async () => {
    const postId = 123;
    
    // Simula retorno: DELETE ... RETURNING id
    mockQuery.mockResolvedValue({ rows: [{ id: postId }] });

    const result = await deletePost(postId);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [text, values] = mockQuery.mock.calls[0];

    expect(text).toContain('DELETE FROM posts WHERE id = $1');
    expect(values).toEqual([postId]);
    expect(result).toEqual({ id: postId });
  });

  it('deve retornar undefined se o post a ser deletado não existir', async () => {
    const result = await deletePost(999);
    expect(result).toBeUndefined();
  });

  it('deve propagar erros ao tentar deletar', async () => {
    const dbError = new Error('Erro de chave estrangeira');
    mockQuery.mockRejectedValue(dbError);

    // Silencia o console.error para este teste para evitar poluir o log
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deletePost(1)).rejects.toThrow('Erro de chave estrangeira');

    // Verifica se o erro foi de fato logado pela função 'query'
    expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao executar consulta SQL', {
      code: undefined,
      duration: expect.any(String),
      message: 'Erro de chave estrangeira',
      query: 'DELETE FROM posts WHERE id = $1 RETURNING id'
    });

    consoleErrorSpy.mockRestore();
  });
});