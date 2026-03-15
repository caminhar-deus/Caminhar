import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockQuery } from 'pg';
import { getAllPosts } from '../../../../lib/db.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

describe('getAllPosts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    // Define um retorno padrão para evitar erros de 'undefined' em chamadas não mockadas
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
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM posts ORDER BY created_at DESC', undefined);
    
    // Verifica se o resultado corresponde ao mock
    expect(posts).toEqual(mockPosts);
    expect(posts.length).toBe(2);
  });

  it('deve retornar um array vazio se não houver posts', async () => {
    const posts = await getAllPosts();

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM posts ORDER BY created_at DESC', undefined);
    expect(posts).toEqual([]);
    expect(posts.length).toBe(0);
  });

  it('deve lançar um erro se a consulta ao banco falhar', async () => {
    const dbError = new Error('DB Error');
    mockQuery.mockRejectedValue(dbError);

    // Silencia o console.error para este teste específico para evitar poluir o log
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Garante que a função propaga o erro para quem a chamou
    await expect(getAllPosts()).rejects.toThrow('DB Error');

    // Opcional, mas recomendado: Verifica se o erro foi de fato logado pela função 'query'
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error executing query', { text: 'SELECT * FROM posts ORDER BY created_at DESC' });

    // Restaura a implementação original do console.error
    consoleErrorSpy.mockRestore();
  });
});