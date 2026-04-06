import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks para a camada de autenticação
jest.mock('../../../../../lib/auth.js', () => ({
  authenticate: jest.fn(),
  generateToken: jest.fn(),
}));

// Mocks para o banco de dados (para interceptar o UPDATE de last_login_at)
jest.mock('../../../../../lib/db.js', () => ({
  query: jest.fn(),
}));

import handler from '../../../../../pages/api/v1/auth/login.js';
import { authenticate, generateToken } from '../../../../../lib/auth.js';
import { query } from '../../../../../lib/db.js';

describe('API V1 - Login Externo (/api/v1/auth/login)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 405 se o método não for POST', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 400 se usuário ou senha estiverem ausentes no body', async () => {
    const { req, res } = createMocks({ 
      method: 'POST', 
      body: { username: 'admin' } // senha de propósito omitida
    });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toContain('obrigatórios');
  });

  it('deve retornar 401 se as credenciais forem inválidas (senha incorreta/usuário inexistente)', async () => {
    // Simulamos a função 'authenticate' não encontrando o usuário ou rejeitando a senha
    authenticate.mockResolvedValueOnce(null);
    
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { req, res } = createMocks({ 
      method: 'POST', 
      body: { username: 'admin', password: 'wrongpassword' } 
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData()).message).toBe('Credenciais inválidas');
    
    consoleSpy.mockRestore();
  });

  it('deve permitir o login mesmo se a atualização do timestamp (last_login_at) falhar', async () => {
    const mockUser = { id: 1, username: 'admin', role: 'admin' };
    
    authenticate.mockResolvedValueOnce(mockUser);
    generateToken.mockReturnValueOnce('fake-jwt-token');
    
    // Simula falha EXCLUSIVAMENTE na query secundária que atualiza o timestamp
    query.mockRejectedValueOnce(new Error('Timeout no banco ao atualizar timestamp'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { req, res } = createMocks({ 
      method: 'POST', 
      body: { username: 'admin', password: 'correctpassword' } 
    });
    await handler(req, res);

    // Mesmo com erro na query, o login DEVE prosseguir com status 200
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).success).toBe(true);
    
    consoleSpy.mockRestore();
  });

  it('deve retornar 200, atualizar último login e retornar o token em caso de sucesso', async () => {
    const mockUser = { id: 1, username: 'admin', role: 'admin' };
    
    authenticate.mockResolvedValueOnce(mockUser);
    generateToken.mockReturnValueOnce('fake-jwt-token');
    query.mockResolvedValueOnce({ rowCount: 1 }); // Simula update de last_login_at com sucesso

    const { req, res } = createMocks({ 
      method: 'POST', 
      body: { username: 'admin', password: 'correctpassword' } 
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.success).toBe(true);
    expect(data.data.token).toBe('fake-jwt-token');
    
    // Garante que a atualização do timestamp no banco foi chamada
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET last_login_at'), [1]);
  });

  it('deve retornar 500 caso ocorra uma exceção fatal no servidor', async () => {
    // Força um erro interno para engatilhar as linhas 74-80 do seu código
    authenticate.mockRejectedValueOnce(new Error('Banco de dados fora do ar'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { req, res } = createMocks({ 
      method: 'POST', 
      body: { username: 'admin', password: 'password123' } 
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData()).message).toContain('Erro no servidor');

    consoleSpy.mockRestore();
  });
});