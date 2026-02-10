import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/auth/check';

// Mock do middleware de autenticação para ignorar a verificação de token real
// e permitir injetar o usuário diretamente no request
jest.mock('../lib/auth', () => ({
  withAuth: (handler) => (req, res) => {
    // O middleware real verificaria o token e definiria req.user.
    // Aqui, assumimos que o teste define req.user antes de chamar o handler.
    return handler(req, res);
  }
}));

describe('Endpoint /api/auth/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar os dados do usuário corretamente quando autenticado', async () => {
    const mockUser = {
      userId: 123,
      username: 'usuario_teste',
      role: 'admin'
    };

    const { req, res } = createMocks({
      method: 'GET',
    });

    // Simula o objeto user que o middleware withAuth adicionaria ao request
    req.user = mockUser;

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    
    expect(responseData).toEqual({
      user: {
        id: mockUser.userId,
        username: mockUser.username,
        role: mockUser.role
      }
    });
  });

  it('deve retornar erro 403 se o usuário não for admin', async () => {
    const mockUser = {
      userId: 456,
      username: 'usuario_comum',
      role: 'user'
    };

    const { req, res } = createMocks({
      method: 'GET',
    });

    req.user = mockUser;

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
  });
});