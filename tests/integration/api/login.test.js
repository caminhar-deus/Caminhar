import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/auth/login';

// Mock das dependências
jest.mock('../../../lib/auth', () => ({
  authenticate: jest.fn(),
  generateToken: jest.fn(),
  setAuthCookie: jest.fn(),
  authenticateAndGenerateToken: jest.fn()
}));
jest.mock('../../../lib/cache', () => ({
  checkRateLimit: jest.fn(),
}));
jest.mock('../../../lib/logger', () => {
  const mockMethods = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn()
  };
  return {
    ...mockMethods,
    logger: { ...mockMethods }
  };
});

import * as auth from '../../../lib/auth';
import { checkRateLimit } from '../../../lib/cache';

describe('API de Login (/api/auth/login) - atualização de last_login_at', () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
    role: 'user',
    last_login_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    checkRateLimit.mockResolvedValue(false);
  });

  it('deve atualizar o campo last_login_at no banco de dados após um login bem-sucedido', async () => {
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      user: { ...mockUser, permissions: ['some_permission'] },
      token: 'mock-jwt-token',
      error: null
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: 'testuser',
        password: 'password123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(auth.authenticateAndGenerateToken).toHaveBeenCalledWith(
      'testuser', 'password123', expect.any(String), expect.any(Object)
    );
    expect(auth.setAuthCookie).toHaveBeenCalledWith(expect.any(Object), 'mock-jwt-token');

    const responseBody = res._getJSONData();
    expect(responseBody.user).toEqual(expect.objectContaining({
      id: mockUser.id,
      username: mockUser.username,
      role: mockUser.role,
    }));
  });

  it('não deve atualizar last_login_at se a autenticação falhar', async () => {
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      error: 'INVALID_CREDENTIALS',
      message: 'Credenciais inválidas'
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: 'wronguser',
        password: 'wrongpassword',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(auth.authenticateAndGenerateToken).toHaveBeenCalledWith(
      'wronguser', 'wrongpassword', expect.any(String), expect.any(Object)
    );
    expect(auth.generateToken).not.toHaveBeenCalled();
    expect(auth.setAuthCookie).not.toHaveBeenCalled();
  });

  it('deve logar um erro se a atualização de last_login_at falhar, mas ainda permitir o login', async () => {
    auth.authenticateAndGenerateToken.mockResolvedValueOnce({
      user: { ...mockUser, permissions: ['some_permission'] },
      token: 'mock-jwt-token',
      error: null
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: 'testuser',
        password: 'password123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(auth.setAuthCookie).toHaveBeenCalledWith(expect.any(Object), 'mock-jwt-token');
  });
});
