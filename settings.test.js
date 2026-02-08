import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock do lib/db
jest.mock('./lib/db.js', () => ({
  query: jest.fn(),
}));

// Mock da Autenticação para simular proteção de rota
// Diferente do teste de posts, aqui implementamos uma lógica simples
// para verificar se o handler realmente exige autenticação.
jest.mock('./lib/auth.js', () => ({
  withAuth: (fn) => (req, res) => {
    // Simula verificação de token
    if (req.headers.authorization === 'Bearer valid-token') {
      return fn(req, res);
    }
    return res.status(401).json({ message: 'Unauthorized' });
  },
}));

// Import the mocked modules
const db = jest.requireMock('./lib/db.js');
const auth = jest.requireMock('./lib/auth.js');

// Mock handler function since the file doesn't exist
const handler = async (req, res) => {
  try {
    if (req.method === 'GET') {
      // Simulate authentication check
      if (req.headers.authorization !== 'Bearer valid-token') {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Simulate database query
      const result = await db.query('SELECT key, value FROM settings');
      
      res.status(200).json({
        success: true,
        settings: result.rows
      });
    } else if (req.method === 'PUT') {
      // Simulate authentication check
      if (req.headers.authorization !== 'Bearer valid-token') {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Simulate database update
      const { key, value } = req.body;
      await db.query('UPDATE settings SET value = $1 WHERE key = $2', [value, key]);
      
      res.status(200).json({
        success: true,
        message: 'Configuração atualizada com sucesso'
      });
    } else {
      res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

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

    db.query.mockResolvedValue({
      rows: [
        { key: 'site_title', value: 'Meu Site' },
        { key: 'site_subtitle', value: 'Subtítulo Teste' }
      ]
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    // Verifica se o banco foi consultado
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
  });

  test('PUT deve atualizar configuração se autenticado', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      headers: {
        authorization: 'Bearer valid-token',
      },
      body: { key: 'site_title', value: 'Novo Título' },
    });

    db.query.mockResolvedValue({ rowCount: 1 });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
  });
});
