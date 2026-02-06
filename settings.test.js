const { createMocks } = require('node-mocks-http');
const handler = require('../../pages/api/settings').default;
const { query } = require('../../lib/db');

// Mock do lib/db
jest.mock('../../../lib/db', () => ({
  query: jest.fn(),
}));

// Mock da Autenticação para simular proteção de rota
// Diferente do teste de posts, aqui implementamos uma lógica simples
// para verificar se o handler realmente exige autenticação.
jest.mock('../../../lib/auth', () => ({
  withAuth: (fn) => (req, res) => {
    // Simula verificação de token
    if (req.headers.authorization === 'Bearer valid-token') {
      return fn(req, res);
    }
    return res.status(401).json({ message: 'Unauthorized' });
  },
}));

describe('API de Configurações (/api/settings)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Deve retornar 401 (Unauthorized) se não houver token', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Unauthorized' });
  });

  test('GET deve retornar configurações se autenticado', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    query.mockResolvedValue({
      rows: [
        { key: 'site_title', value: 'Meu Site' },
        { key: 'site_subtitle', value: 'Subtítulo Teste' }
      ]
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    // Verifica se o banco foi consultado
    expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
  });

  test('PUT deve atualizar configuração se autenticado', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: 'Bearer valid-token',
      },
      body: { key: 'site_title', value: 'Novo Título' },
    });

    query.mockResolvedValue({ rowCount: 1 });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
  });
});
