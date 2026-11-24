import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import bcrypt from 'bcryptjs';
import handler from '../../../pages/api/auth/login';
import { query } from '../../../lib/infra/db';
import { checkRateLimit } from '../../../lib/cache/cache';
import { logger } from '../../../lib/infra/logger';

jest.mock('../../../lib/infra/db', () => ({
  query: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('../../../lib/cache/cache', () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock('../../../lib/infra/logger', () => {
  const mockMethods = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  };
  return {
    ...mockMethods,
    logger: { ...mockMethods },
  };
});

describe('API de Login (/api/auth/login) - atualização de last_login_at (integração real)', () => {
  const mockUser = {
    id: 7,
    username: 'testuser',
    password: 'hashedpassword',
    role: 'editor',
    last_login_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    checkRateLimit.mockResolvedValue(false);
  });

  it('deve atualizar o campo last_login_at no banco de dados após um login bem-sucedido', async () => {
    query
      .mockResolvedValueOnce({ rows: [mockUser] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ permissions: JSON.stringify(['Posts/Artigos']) }] })
      .mockResolvedValueOnce({ rows: [] });
    bcrypt.compare.mockResolvedValueOnce(true);

    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'testuser', password: 'password123' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(query).toHaveBeenCalledWith(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [mockUser.id]
    );
    const setCookies = res.getHeader('Set-Cookie');
    expect(Array.isArray(setCookies)).toBe(true);
    expect(setCookies.some((c) => c.startsWith('token='))).toBe(true);
    expect(setCookies.some((c) => c.startsWith('refreshToken='))).toBe(true);

    const responseBody = res._getJSONData();
    expect(responseBody.user).toEqual(
      expect.objectContaining({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        permissions: ['Posts/Artigos'],
      })
    );
  });

  it('não deve atualizar last_login_at se a autenticação falhar', async () => {
    query.mockResolvedValueOnce({ rows: [mockUser] });
    bcrypt.compare.mockResolvedValueOnce(false);

    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'testuser', password: 'wrongpassword' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET last_login_at'),
      expect.anything()
    );
    expect(res.getHeader('Set-Cookie')).toBeUndefined();
  });

  it('deve logar um erro se a atualização de last_login_at falhar, mas ainda permitir o login', async () => {
    const dbError = new Error('Falha transitória ao gravar last_login_at');
    query
      .mockResolvedValueOnce({ rows: [mockUser] })
      .mockRejectedValueOnce(dbError)
      .mockResolvedValueOnce({ rows: [{ permissions: JSON.stringify(['Posts/Artigos']) }] })
      .mockResolvedValueOnce({ rows: [] });
    bcrypt.compare.mockResolvedValueOnce(true);

    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'testuser', password: 'password123' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(logger.error).toHaveBeenCalledWith(
      'Auth',
      'Falha ao atualizar o timestamp de login:',
      dbError
    );
    const setCookies = res.getHeader('Set-Cookie');
    expect(Array.isArray(setCookies)).toBe(true);
    expect(setCookies.some((c) => c.startsWith('token='))).toBe(true);
    expect(setCookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
  });
});
