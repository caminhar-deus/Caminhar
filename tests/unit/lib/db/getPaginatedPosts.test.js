import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockQuery, restorePoolImplementation } from 'pg';
import { resetPool } from '../../../../lib/db.js';
import { getPaginatedPosts } from '../../../../lib/domain/posts.js';

// Mock do 'pg' (automático via __mocks__/pg.js)
jest.mock('pg');

describe('getPaginatedPosts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    restorePoolImplementation(); // Restaura Pool após clearAllMocks apagar sua implementação
    resetPool();                 // Descarta o pool cacheado para forçar new Pool() no próximo uso
    // Define um retorno padrão para evitar erros de 'undefined' em chamadas não mockadas
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('deve retornar posts paginados corretamente (sem busca)', async () => {
    const page = 1;
    const limit = 10;

    // Configura o mock para responder baseado na query SQL para garantir robustez com Promise.all
    mockQuery.mockImplementation((text) => {
      if (text.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '50' }] });
      }
      return Promise.resolve({ rows: [{ id: 1, title: 'Post 1' }] });
    });

    const result = await getPaginatedPosts(page, limit);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    
    // Verifica parâmetros da query de posts (offset calculado)
    // Sem busca: LIMIT $1 OFFSET $2 -> params: [limit, offset]
    const postsCallArgs = mockQuery.mock.calls[0];
    expect(postsCallArgs[1]).toEqual([10, 0]); // limit 10, offset 0

    expect(result).toEqual({
      posts: [{ id: 1, title: 'Post 1' }],
      pagination: {
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5 // 50 / 10 = 5
      }
    });
  });

  it('deve filtrar por termo de busca e calcular offset correto', async () => {
    const page = 3;
    const limit = 10;
    const search = 'Teste';

    mockQuery.mockImplementation((text) => {
      if (text.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '5' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await getPaginatedPosts(page, limit, search);

    // Verifica parâmetros com busca
    // Com busca: WHERE ... LIKE $1 ... LIMIT $2 OFFSET $3
    // Params esperados: ['%teste%', limit, offset]
    // Offset pagina 3: (3-1)*10 = 20
    const postsCallArgs = mockQuery.mock.calls[0];
    expect(postsCallArgs[0]).toContain('WHERE LOWER(title) LIKE $1');
    expect(postsCallArgs[1]).toEqual(['%teste%', 10, 20]);
  });
});