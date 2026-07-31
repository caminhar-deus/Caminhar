import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockQuery, restorePoolImplementation } from 'pg';
import { resetPool } from '../../../../lib/infra/db.js';
import { deletePost } from '../../../../lib/domain/posts.js';
import { logger } from '../../../../lib/infra/logger.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

jest.mock('../../../../lib/infra/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

describe('deletePost', () => {
  beforeEach(() => {
    restorePoolImplementation();
    resetPool();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('deve deletar um post pelo ID e retornar o ID removido', async () => {
    const postId = 123;
    
    // Simula retorno: DELETE ... RETURNING id
    mockQuery.mockResolvedValue({ rows: [{ id: postId }] });

    const result = await deletePost(postId);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [text, values] = mockQuery.mock.calls[0];

    // Normaliza o SQL para remover espaços/quebras de linha extras, tornando o teste mais robusto.
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    expect(normalizedText).toBe('DELETE FROM posts WHERE id = $1 RETURNING id');
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

    await expect(deletePost(1)).rejects.toThrow('Erro de chave estrangeira');

    // Verifica se o erro foi de fato logado pela função 'query'
    expect(logger.error).toHaveBeenCalledWith(
      'DB',
      'Erro ao executar consulta SQL',
      expect.objectContaining({
        code: undefined,
        duration: expect.any(String),
        message: 'Erro de chave estrangeira',
        query: 'DELETE FROM posts WHERE id = $1 RETURNING id'
      })
    );
  });
});