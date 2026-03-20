import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { createPostRequest, executeHandler } from '@tests/helpers/api.js';
import handler from '../../../../pages/api/admin/cache.js';

// Mock do Redis para verificar se flushdb é chamado
jest.mock('../../../../lib/redis.js', () => ({
  redis: {
    flushdb: jest.fn().mockResolvedValue('OK'),
  }
}));

// Mock da lib auth
jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// Import the mocked modules
const auth = jest.requireMock('../../../../lib/auth.js');
const redis = jest.requireMock('../../../../lib/redis.js').redis;

describe('Endpoint de Limpeza de Cache (/api/admin/cache)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve rejeitar métodos não permitidos (GET)', async () => {
    const { req, res } = createPostRequest({}, { method: 'GET' });
    await executeHandler(handler, req, res);
    
    // O handler valida autenticação antes do método, então retorna 401
    expect(res).toHaveStatus(401);
    expect(res).toBeValidJSON({ message: expect.stringMatching(/Autenticação necessária/) });
  });

  it('deve rejeitar requisições sem token (401)', async () => {
    auth.getAuthToken.mockReturnValue(null);
    
    const { req, res } = createPostRequest({});
    await executeHandler(handler, req, res);
    
    expect(res).toHaveStatus(401);
    expect(res).toBeValidJSON({ message: expect.stringMatching(/Autenticação necessária/) });
  });

  it('deve rejeitar usuários não administradores (403)', async () => {
    auth.getAuthToken.mockReturnValue('valid-token');
    auth.verifyToken.mockReturnValue({ role: 'user', username: 'usuario_comum' });
    
    const { req, res } = createPostRequest({}, { 
      headers: { 
        'authorization': 'Bearer valid-token',
        'user': JSON.stringify({ role: 'user', username: 'usuario_comum' })
      }
    });
    await executeHandler(handler, req, res);
    
    expect(res).toHaveStatus(403);
    expect(res).toBeValidJSON({ message: expect.stringMatching(/Acesso negado/) });
  });

  it('deve limpar o cache e retornar 200 para administradores (POST)', async () => {
    auth.getAuthToken.mockReturnValue('admin-token');
    auth.verifyToken.mockReturnValue({ role: 'admin', username: 'admin' });
    
    const { req, res } = createPostRequest({}, { 
      headers: { 
        'authorization': 'Bearer admin-token',
        'user': JSON.stringify({ role: 'admin', username: 'admin' })
      }
    });
    await executeHandler(handler, req, res);

    expect(res).toHaveStatus(200);
    expect(redis.flushdb).toHaveBeenCalledTimes(1);
    expect(res).toBeValidJSON({ success: true, message: expect.stringContaining('Cache do Redis limpo') });
  });
});
