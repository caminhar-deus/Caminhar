import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/admin/verify-migration';
import { query } from '../../../../lib/db';

// Mock do banco de dados (PostgreSQL via pg)
jest.mock('../../../../lib/db', () => ({
  query: jest.fn(),
}));

// Mock da autenticação
jest.mock('../../../../lib/auth', () => ({
  withAuth: (fn) => (req, res) => {
    req.user = { username: 'admin' };
    return fn(req, res);
  },
}));

describe('API Verify Migration (/api/admin/verify-migration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Deve retornar relatório de integridade com contagens e amostras', async () => {
    // Configura os mocks para as 5 queries que são executadas
    // 1-4: Contagens (Promise.all) - A ordem depende da implementação do Promise.all
    query
      .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // users
      .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // posts
      .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // settings
      .mockResolvedValueOnce({ rows: [{ count: '8' }] }) // images
      // 5: Amostra de posts
      .mockResolvedValueOnce({ 
        rows: [
          { id: 1, title: 'Post 1', slug: 'post-1', published: true, created_at: '2026-01-01' }
        ] 
      });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.success).toBe(true);
    expect(data.database).toBe('PostgreSQL');
    
    // Verifica contagens
    expect(data.counts).toEqual({
      users: 5,
      posts: 10,
      settings: 3,
      images: 8
    });

    // Verifica amostra
    expect(data.samples.latest_posts).toHaveLength(1);
    expect(data.samples.latest_posts[0].title).toBe('Post 1');
  });

  test('Deve retornar erro 500 se houver falha no banco de dados', async () => {
    // Simula erro na primeira query
    query.mockRejectedValue(new Error('Erro de conexão'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Erro de conexão');
  });

  test('Deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});