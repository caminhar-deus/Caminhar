const { createMocks } = require('node-mocks-http');
const handler = require('../../../pages/api/admin/posts').default;
const { query } = require('../../../lib/db');

// Mock do lib/db
jest.mock('../../../../lib/db', () => ({
  query: jest.fn(),
}));

// Mock da autenticação para permitir o teste direto do handler
jest.mock('../../../../lib/auth', () => ({
  withAuth: (fn) => (req, res) => fn(req, res),
}));

describe('API de Posts (/api/admin/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET retorna lista de posts paginada e formatada', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '1', limit: '5' },
    });

    // Mock das queries (Count e Select)
    query
      .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // Count
      .mockResolvedValueOnce({ rows: [
        { id: 1, title: 'Post 1', published: true },
        { id: 2, title: 'Post 2', published: false },
      ]}); // Select

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.data).toHaveLength(2);
    expect(data.data[0].published).toBe(true); // Verifica conversão
    expect(data.data[1].published).toBe(false);
    expect(data.pagination.total).toBe(2);
  });

  test('POST cria um novo post com dados válidos', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Novo Post',
        slug: 'novo-post',
        content: 'Conteúdo do post',
        published: true
      },
    });

    // Mock do INSERT RETURNING *
    query.mockResolvedValue({ rows: [{ id: 10, title: 'Novo Post' }] });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO posts'),
      expect.arrayContaining(['Novo Post', 'novo-post'])
    );
  });

  test('POST retorna 400 se dados forem inválidos (Validação Zod)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: '', // Título vazio deve falhar
        slug: ''
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.message).toBe('Dados inválidos');
    expect(data.errors).toHaveProperty('title');
  });
});
