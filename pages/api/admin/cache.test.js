const { createMocks } = require('node-mocks-http');
const handler = require('../../../pages/api/admin/cache').default;
const auth = require('../../../lib/auth');
const { redis } = require('../../../lib/redis');

// Mock das dependências
jest.mock('../../../lib/auth', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// Mock do Redis para verificar se flushdb é chamado
jest.mock('../../../lib/redis', () => ({
  redis: {
    flushdb: jest.fn().mockResolvedValue('OK'),
  }
}));

describe('Endpoint de Limpeza de Cache (/api/admin/cache)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve rejeitar métodos não permitidos (GET)', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData()).message).toMatch(/Método não permitido/);
  });

  it('deve rejeitar requisições sem token (401)', async () => {
    auth.getAuthToken.mockReturnValue(null);
    
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(401);
  });

  it('deve rejeitar usuários não administradores (403)', async () => {
    auth.getAuthToken.mockReturnValue('valid-token');
    auth.verifyToken.mockReturnValue({ role: 'user', username: 'usuario_comum' });
    
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(403);
  });

  it('deve limpar o cache e retornar 200 para administradores (POST)', async () => {
    auth.getAuthToken.mockReturnValue('admin-token');
    auth.verifyToken.mockReturnValue({ role: 'admin', username: 'admin' });

    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(redis.flushdb).toHaveBeenCalledTimes(1);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toContain('Cache do Redis limpo');
  });
});
