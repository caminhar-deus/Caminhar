import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

const mockRedisInstance = {
  lpush: jest.fn(),
  ltrim: jest.fn(),
  smembers: jest.fn(),
  lrange: jest.fn(),
  keys: jest.fn(),
  pipeline: jest.fn(() => ({
    get: jest.fn(),
    ttl: jest.fn(),
    exec: jest.fn().mockResolvedValue([])
  })),
  sadd: jest.fn(),
  del: jest.fn(),
  srem: jest.fn()
};

jest.mock('@upstash/redis', () => ({
  Redis: function() { return mockRedisInstance; }
}));

jest.mock('../../../../../lib/auth.js', () => ({
  __esModule: true,
  withAuth: (handler) => (req, res) => {
    req.user = req.user || { role: 'admin' };
    return handler(req, res);
  }
}));

describe('API - Admin - Rate Limit', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.UPSTASH_REDIS_REST_URL = 'http://fake-redis';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const getHandler = () => require('../../../../../pages/api/admin/rate-limit.js').default;

  it('deve retornar 501 se o Redis não estiver configurado', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    const handler = getHandler();
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(501);
  });

  it('deve exportar CSV com os filtros de data e busca aplicados', async () => {
    const handler = getHandler();
    mockRedisInstance.lrange.mockResolvedValueOnce([
      JSON.stringify({ timestamp: '2023-01-01T10:00:00Z', action: 'Bloqueio', ip: '1.1.1.1', user: 'admin' }),
      JSON.stringify({ timestamp: '2023-01-02T10:00:00Z', action: 'Bloqueio', ip: '2.2.2.2', user: 'user1' })
    ]);

    const { req, res } = createMocks({
      method: 'GET',
      query: { type: 'export_csv', startDate: '2022-12-31', endDate: '2023-01-02', search: '1.1.1.1' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getData()).toContain('1.1.1.1'); // Garante que a busca filtrou o item 1
    expect(res._getData()).not.toContain('2.2.2.2'); // Garante que o item 2 ficou de fora
  });

  it('deve retornar o IP atual corretamente (type=current_ip)', async () => {
    const handler = getHandler();
    const { req, res } = createMocks({
      method: 'GET',
      query: { type: 'current_ip' },
      headers: {}
    });
    req.socket = { remoteAddress: '::1' };
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ ip: '127.0.0.1' });
  });

  it('deve listar a whitelist corretamente (type=whitelist)', async () => {
    const handler = getHandler();
    const { req, res } = createMocks({ method: 'GET', query: { type: 'whitelist' } });
    mockRedisInstance.smembers.mockResolvedValueOnce(['10.0.0.1']);
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(['10.0.0.1']);
  });

  it('deve listar logs de auditoria com paginação e busca (type=audit)', async () => {
    const handler = getHandler();
    mockRedisInstance.lrange.mockResolvedValueOnce([
      JSON.stringify({ timestamp: '2023-01-01T10:00:00Z', action: 'Bloqueio', ip: '1.1.1.1', user: 'admin' }),
      JSON.stringify({ timestamp: '2023-01-02T10:00:00Z', action: 'Desbloqueio', ip: '2.2.2.2', user: null })
    ]);
    const { req, res } = createMocks({ method: 'GET', query: { type: 'audit', search: 'admin' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0].ip).toBe('1.1.1.1');
  });

  it('deve retornar IPs bloqueados e ignorar os que não excederam o limite', async () => {
    const handler = getHandler();
    mockRedisInstance.keys.mockResolvedValueOnce(['rate_limit:10.0.0.1', 'rate_limit:10.0.0.2']);
    mockRedisInstance.pipeline.mockImplementationOnce(() => ({
      get: jest.fn(),
      ttl: jest.fn(),
      exec: jest.fn().mockResolvedValue([10, 60, 2, 60]) // 10 tentativas (bloqueado), 2 tentativas (permitido)
    }));
    const { req, res } = createMocks({ method: 'GET', query: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual([{ ip: '10.0.0.1', count: 10, ttl: 1 }]);
  });

  it('deve retornar array vazio se não houver chaves ativas no Redis', async () => {
    const handler = getHandler();
    mockRedisInstance.keys.mockResolvedValueOnce([]);
    const { req, res } = createMocks({ method: 'GET', query: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual([]);
  });

  it('deve adicionar IP à whitelist e registrar auditoria (POST)', async () => {
    const handler = getHandler();
    const { req, res } = createMocks({ method: 'POST', body: { ip: '1.1.1.1' } });
    req.user = { username: 'admin' };
    await handler(req, res);
    expect(mockRedisInstance.sadd).toHaveBeenCalledWith('rate_limit:whitelist', '1.1.1.1');
    expect(mockRedisInstance.del).toHaveBeenCalledWith('rate_limit:1.1.1.1');
    expect(mockRedisInstance.lpush).toHaveBeenCalled(); // Verifica chamada do logAudit
    expect(res._getStatusCode()).toBe(200);
  });

  it('deve retornar 400 se IP não for fornecido no POST', async () => {
    const handler = getHandler();
    const { req, res } = createMocks({ method: 'POST', body: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('deve remover IP da whitelist (DELETE com type=whitelist)', async () => {
    const handler = getHandler();
    const { req, res } = createMocks({ method: 'DELETE', query: { type: 'whitelist', ip: '1.1.1.1' } });
    req.user = { username: 'admin' };
    await handler(req, res);
    expect(mockRedisInstance.srem).toHaveBeenCalledWith('rate_limit:whitelist', '1.1.1.1');
    expect(res._getStatusCode()).toBe(200);
  });

  it('deve desbloquear IP manualmente e usar fallback de usuário no log (DELETE)', async () => {
    const handler = getHandler();
    const { req, res } = createMocks({ method: 'DELETE', query: { ip: '1.1.1.1' } }); // Sem informar req.user
    await handler(req, res);
    expect(mockRedisInstance.del).toHaveBeenCalledWith('rate_limit:1.1.1.1');
    expect(mockRedisInstance.lpush).toHaveBeenCalledWith('rate_limit:audit_logs', expect.stringContaining('"Sistema"'));
    expect(res._getStatusCode()).toBe(200);
  });

  it('deve retornar 400 se IP não for fornecido no DELETE', async () => {
    const handler = getHandler();
    const { req, res } = createMocks({ method: 'DELETE', query: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('deve retornar 405 para métodos HTTP não permitidos', async () => {
    const handler = getHandler();
    const { req, res } = createMocks({ method: 'PUT' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve cair no catch se ocorrer um erro interno e retornar 500', async () => {
    const handler = getHandler();
    mockRedisInstance.keys.mockRejectedValueOnce(new Error('Redis Timeout'));
    const { req, res } = createMocks({ method: 'GET', query: { type: 'unknown' } });
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    consoleSpy.mockRestore();
  });
});
