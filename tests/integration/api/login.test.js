import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/auth/login'; // O handler da API de login

// Mock das dependências
jest.mock('../../../lib/db', () => ({
  query: jest.fn(),
}));
jest.mock('../../../lib/auth', () => ({
  authenticate: jest.fn(),
  generateToken: jest.fn(),
  setAuthCookie: jest.fn(),
  // Mock de outras funções de auth se forem chamadas no handler de login
}));
jest.mock('../../../lib/cache', () => ({
  checkRateLimit: jest.fn(),
}));

import { query } from '../../../lib/db';
import { authenticate, generateToken, setAuthCookie } from '../../../lib/auth';
import { checkRateLimit } from '../../../lib/cache';

describe('API de Login (/api/auth/login) - atualização de last_login_at', () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
    role: 'user',
    last_login_at: null, // Inicialmente nulo
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock de autenticação bem-sucedida
    authenticate.mockResolvedValue(mockUser);
    generateToken.mockReturnValue('mock-jwt-token');
    setAuthCookie.mockImplementation(() => {}); // Não faz nada ao definir o cookie

    // Mock para permitir todas as requisições de rate limit
    checkRateLimit.mockResolvedValue(false);

    // Mock da função query para interações com o banco de dados
    query.mockImplementation((sql, params) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return Promise.resolve({ rows: [{ permissions: ['some_permission'] }] });
      }
      // Para a query de UPDATE, apenas resolvemos
      if (sql.includes('UPDATE users SET last_login_at')) {
        return Promise.resolve({ rowCount: 1 }); // Indica que uma linha foi atualizada
      }
      return Promise.resolve({ rows: [] }); // Padrão para outras queries
    });
  });

  it('deve atualizar o campo last_login_at no banco de dados após um login bem-sucedido', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: 'testuser',
        password: 'password123',
      },
    });

    await handler(req, res);

    // Asserções
    expect(res._getStatusCode()).toBe(200);
    expect(authenticate).toHaveBeenCalledWith('testuser', 'password123');
    expect(generateToken).toHaveBeenCalledWith(expect.objectContaining({ id: mockUser.id }));
    expect(setAuthCookie).toHaveBeenCalledWith(expect.any(Object), 'mock-jwt-token');

    // Asserção crucial: verifica se a query de UPDATE foi chamada
    expect(query).toHaveBeenCalledWith(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [mockUser.id]
    );

    // Opcional: verifica o corpo da resposta, se necessário
    const responseBody = res._getJSONData();
    expect(responseBody.user).toEqual(expect.objectContaining({
      id: mockUser.id,
      username: mockUser.username,
      role: mockUser.role,
    }));
  });

  it('não deve atualizar last_login_at se a autenticação falhar', async () => {
    authenticate.mockResolvedValue(null); // Simula falha na autenticação

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: 'wronguser',
        password: 'wrongpassword',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(authenticate).toHaveBeenCalledWith('wronguser', 'wrongpassword');
    expect(generateToken).not.toHaveBeenCalled();
    expect(setAuthCookie).not.toHaveBeenCalled();

    // Asserção crucial: garante que a query de UPDATE NÃO foi chamada
    expect(query).not.toHaveBeenCalledWith(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      expect.any(Array)
    );
  });

  it('deve logar um erro se a atualização de last_login_at falhar, mas ainda permitir o login', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock da função query para lançar um erro especificamente para o UPDATE
    query.mockImplementation((sql, params) => {
      if (sql.includes('UPDATE users SET last_login_at')) {
        return Promise.reject(new Error('Falha na atualização do DB'));
      }
      if (sql.includes('SELECT permissions FROM roles')) {
        return Promise.resolve({ rows: [{ permissions: ['some_permission'] }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: 'testuser',
        password: 'password123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200); // O login ainda deve ser bem-sucedido
    expect(authenticate).toHaveBeenCalledWith('testuser', 'password123');
    expect(generateToken).toHaveBeenCalled();
    expect(setAuthCookie).toHaveBeenCalled();

    // Asserção de que o erro foi logado
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Falha ao atualizar o timestamp de login:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});