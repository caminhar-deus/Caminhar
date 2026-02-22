import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de autenticação
jest.mock('../../../lib/auth', () => ({
  authenticate: jest.fn(),
  generateToken: jest.fn(),
}));

const auth = jest.requireMock('../../../lib/auth');

// Simulação do handler da API v1 login (/api/v1/auth/login)
// Baseado na documentação em pages/api/v1/README.md
const loginHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Método não permitido',
      timestamp: new Date().toISOString()
    });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Usuário e senha são obrigatórios',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const user = await auth.authenticate(username, password);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Credenciais inválidas',
        timestamp: new Date().toISOString()
      });
    }

    const token = auth.generateToken(user);

    return res.status(200).json({
      success: true,
      data: {
        token,
        token_type: 'Bearer',
        expires_in: 3600,
        user: {
          userId: user.id,
          username: user.username,
          role: user.role
        }
      },
      message: 'Autenticação bem-sucedida',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
};

describe('API v1 Auth Login (/api/v1/auth/login)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve autenticar com sucesso e retornar um token JWT', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'admin', password: 'password' }
    });

    const mockUser = { id: 1, username: 'admin', role: 'admin' };
    auth.authenticate.mockResolvedValue(mockUser);
    auth.generateToken.mockReturnValue('mocked.jwt.token');

    await loginHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());

    expect(response.success).toBe(true);
    expect(response.data.token).toBe('mocked.jwt.token');
    expect(response.data.user.username).toBe('admin');
    expect(auth.authenticate).toHaveBeenCalledWith('admin', 'password');
  });

  it('deve retornar 401 para credenciais inválidas', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'admin', password: 'wrongpassword' }
    });

    auth.authenticate.mockResolvedValue(null);

    await loginHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const response = JSON.parse(res._getData());
    expect(response.message).toBe('Credenciais inválidas');
  });

  it('deve retornar 400 se campos obrigatórios estiverem faltando', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'admin' } // senha faltando
    });

    await loginHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const response = JSON.parse(res._getData());
    expect(response.message).toBe('Usuário e senha são obrigatórios');
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await loginHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});