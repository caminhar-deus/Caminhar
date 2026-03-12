import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { getAllPosts } from '../../../../lib/db.js';

// O mock do 'pg' será o mesmo usado nos outros testes de DB
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockPool = {
    query: mockQuery,
    end: jest.fn(),
    on: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('getAllPosts', () => {
  let pool;
  let mockQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    pool = new Pool();
    mockQuery = pool.query;
  });

  it('deve retornar uma lista de posts do banco de dados', async () => {
    const mockPosts = [
      { id: 1, title: 'Primeiro Post', content: '...' },
      { id: 2, title: 'Segundo Post', content: '...' },
    ];
    mockQuery.mockResolvedValue({ rows: mockPosts, rowCount: 2 });

    const posts = await getAllPosts();

    // Verifica se a query SQL correta foi executada
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM posts ORDER BY created_at DESC', undefined);
    
    // Verifica se o resultado corresponde ao mock
    expect(posts).toEqual(mockPosts);
    expect(posts.length).toBe(2);
  });

  it('deve retornar um array vazio se não houver posts', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    const posts = await getAllPosts();

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM posts ORDER BY created_at DESC', undefined);
    expect(posts).toEqual([]);
    expect(posts.length).toBe(0);
  });

  it('deve lançar um erro se a consulta ao banco falhar', async () => {
    const dbError = new Error('DB Error');
    mockQuery.mockRejectedValue(dbError);

    // Garante que a função propaga o erro para quem a chamou
    await expect(getAllPosts()).rejects.toThrow('DB Error');
  });
});