import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockQuery, restorePoolImplementation } from 'pg';
import { resetPool } from '../../../../lib/infra/db.js';
import { getAllPosts } from '../../../../lib/domain/posts.js';
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

describe('getAllPosts', () => {
  beforeEach(() => {
    restorePoolImplementation();
    resetPool();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('deve retornar uma lista de posts do banco de dados', async () => {
    const mockPosts = [
      { id: 1, title: 'Primeiro Post', content: '...' },
      { id: 2, title: 'Segundo Post', content: '...' },
    ];
    mockQuery.mockResolvedValue({ rows: mockPosts, rowCount: 2 });

    const posts = await getAllPosts();

    // Verifica se a query SQL correta foi executada
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM posts ORDER BY created_at DESC', []);
    
    // Verifica se o resultado corresponde ao mock
    expect(posts).toEqual(mockPosts);
    expect(posts.length).toBe(2);
  });

  it('deve retornar um array vazio se não houver posts', async () => {
    const posts = await getAllPosts();

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM posts ORDER BY created_at DESC', []);
    expect(posts).toEqual([]);
    expect(posts.length).toBe(0);
  });

  it('deve lançar um erro se a consulta ao banco falhar', async () => {
    const dbError = new Error('DB Error');
    mockQuery.mockRejectedValue(dbError);

    // Garante que a função propaga o erro para quem a chamou
    await expect(getAllPosts()).rejects.toThrow('DB Error');

    // Opcional, mas recomendado: Verifica se o erro foi de fato logado pela função 'query'
    expect(logger.error).toHaveBeenCalledWith(
      'DB',
      'Erro ao executar consulta SQL',
      expect.objectContaining({
        code: undefined,
        duration: expect.any(String),
        message: 'DB Error',
        query: 'SELECT * FROM posts ORDER BY created_at DESC'
      })
    );
  });
});