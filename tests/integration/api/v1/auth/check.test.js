import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks para isolar a autenticação
jest.mock('../../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import handler from '../../../../../pages/api/v1/auth/check.js';
import { getAuthToken, verifyToken } from '../../../../../lib/auth.js';

describe('API V1 - Auth Check (/api/v1/auth/check)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 405 se o método não for GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 401 se o token não for fornecido', async () => {
    getAuthToken.mockReturnValue(null);
    
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData()).message).toBe('Authentication required');
  });

  it('deve retornar 401 se o token for inválido ou expirado', async () => {
    getAuthToken.mockReturnValue('token-invalido');
    verifyToken.mockReturnValue(null); // Simula falha na validação do JWT
    
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData()).message).toBe('Invalid or expired token');
  });

  it('deve retornar 200 e os dados do usuário se o token for válido', async () => {
    const mockUser = { userId: 99, username: 'admin', role: 'admin' };
    getAuthToken.mockReturnValue('token-valido');
    verifyToken.mockReturnValue(mockUser);
    
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    
    expect(responseData.success).toBe(true);
    expect(responseData.data.authenticated).toBe(true);
    expect(responseData.data.user).toEqual(mockUser);
  });

  it('deve retornar 500 caso ocorra uma exceção no servidor', async () => {
    // Força uma falha estourando um erro diretamente no momento de ler o token
    getAuthToken.mockImplementation(() => {
      throw new Error('Falha catastrófica simulada no servidor');
    });
    
    // Silencia o console.error temporariamente para manter o terminal limpo
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData()).message).toContain('Erro no servidor');
    
    consoleSpy.mockRestore();
  });
});