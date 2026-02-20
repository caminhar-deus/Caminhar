import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da biblioteca de autenticação
jest.mock('./lib/auth', () => ({
  verifyToken: jest.fn(),
}));

const auth = jest.requireMock('./lib/auth');

// Simulação do handler da API v1 check (/api/v1/auth/check)
// Baseado na documentação em pages/api/v1/README.md
const checkHandler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Método não permitido',
      timestamp: new Date().toISOString()
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token ausente ou inválido',
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = auth.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token inválido ou expirado',
      timestamp: new Date().toISOString()
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      authenticated: true,
      user: {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      }
    },
    message: 'Autenticação válida',
    timestamp: new Date().toISOString()
  });
};

describe('API v1 Auth Check (/api/v1/auth/check)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 200 e dados do usuário para um token válido', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'Authorization': 'Bearer valid.token' }
    });

    const mockUser = { userId: 1, username: 'admin', role: 'admin' };
    auth.verifyToken.mockReturnValue(mockUser);

    await checkHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());

    expect(response.success).toBe(true);
    expect(response.data.authenticated).toBe(true);
    expect(response.data.user.username).toBe('admin');
    expect(auth.verifyToken).toHaveBeenCalledWith('valid.token');
  });

  it('deve retornar 401 se o token não for fornecido', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {} // Sem header Authorization
    });

    await checkHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const response = JSON.parse(res._getData());
    expect(response.message).toBe('Token ausente ou inválido');
  });

  it('deve retornar 401 se o token for inválido', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'Authorization': 'Bearer invalid.token' }
    });

    auth.verifyToken.mockReturnValue(null);

    await checkHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const response = JSON.parse(res._getData());
    expect(response.message).toBe('Token inválido ou expirado');
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await checkHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});