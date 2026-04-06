import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks the Redis instance methods
const mockSmembers = jest.fn();
const mockLrange = jest.fn();
const mockKeys = jest.fn();
const mockPipelineGet = jest.fn();
const mockPipelineTtl = jest.fn();
const mockPipelineExec = jest.fn();
const mockSadd = jest.fn();
const mockDel = jest.fn();
const mockSrem = jest.fn();
const mockLpush = jest.fn();
const mockLtrim = jest.fn();

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({
    smembers: mockSmembers,
    lrange: mockLrange,
    keys: mockKeys,
    pipeline: () => ({
      get: mockPipelineGet,
      ttl: mockPipelineTtl,
      exec: mockPipelineExec,
    }),
    sadd: mockSadd,
    del: mockDel,
    srem: mockSrem,
    lpush: mockLpush,
    ltrim: mockLtrim,
  })),
}));

jest.mock('../../../../lib/auth.js', () => ({
  withAuth: jest.fn((h) => async (req, res) => {
    if (req.headers.authorization !== 'Bearer valid-token') {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    req.user = { userId: 1, username: 'admin', role: 'admin' };
    return h(req, res);
  }),
}));

describe('API Admin - Rate Limit (/api/admin/rate-limit)', () => {
  let handler;
  const originalEnv = process.env;

  beforeAll(async () => {
    // Define variáveis de ambiente simuladas ANTES de importar o módulo
    // Isso força o módulo a instanciar o objeto Redis real (mockado) e não cair no fallback Null
    process.env = { ...originalEnv, UPSTASH_REDIS_REST_URL: 'url', UPSTASH_REDIS_REST_TOKEN: 'token' };
    const module = await import('../../../../pages/api/admin/rate-limit.js');
    handler = module.default;
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getAuthenticatedMocks = (options = {}) => {
    const { req, res } = createMocks({
      ...options,
      headers: { ...options.headers, authorization: 'Bearer valid-token' },
    });
    req.socket = { remoteAddress: '127.0.0.1' };
    return { req, res };
  };

  describe('GET - Consultas', () => {
    it('deve retornar o IP atual quando type=current_ip', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'GET', query: { type: 'current_ip' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).ip).toBe('127.0.0.1');
    });

    it('deve retornar a whitelist quando type=whitelist', async () => {
      mockSmembers.mockResolvedValueOnce(['10.0.0.1']);
      const { req, res } = getAuthenticatedMocks({ method: 'GET', query: { type: 'whitelist' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(['10.0.0.1']);
    });

    it('deve listar os logs de auditoria com paginação e filtros (type=audit)', async () => {
      const mockLogs = [
        JSON.stringify({ timestamp: '2026-04-01T10:00:00Z', action: 'Bloqueio', ip: '10.0.0.1', user: 'admin' }),
        JSON.stringify({ timestamp: '2026-04-02T10:00:00Z', action: 'Desbloqueio', ip: '10.0.0.2', user: 'admin' })
      ];
      mockLrange.mockResolvedValueOnce(mockLogs);

      const { req, res } = getAuthenticatedMocks({ 
        method: 'GET', 
        query: { type: 'audit', search: '10.0.0.1', startDate: '2026-01-01', endDate: '2026-12-31' } 
      });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).logs[0].ip).toBe('10.0.0.1');
    });

    it('deve exportar logs em formato CSV (type=export_csv)', async () => {
      const mockLogs = [JSON.stringify({ timestamp: '2026-04-01T10:00:00Z', action: 'Bloqueio', ip: '127.0.0.1', user: 'admin' })];
      mockLrange.mockResolvedValueOnce(mockLogs);

      const { req, res } = getAuthenticatedMocks({ method: 'GET', query: { type: 'export_csv' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Content-Type')).toBe('text/csv; charset=utf-8');
      expect(res._getData()).toContain('127.0.0.1');
    });

    it('deve listar IPs bloqueados combinando keys e pipeline', async () => {
      mockKeys.mockResolvedValueOnce(['rate_limit:10.0.0.5']);
      mockPipelineExec.mockResolvedValueOnce([10, 3600]); // count=10 (excede limite), ttl=3600

      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())[0].ip).toBe('10.0.0.5');
    });
    
    it('deve retornar array vazio se não houver chaves', async () => {
      mockKeys.mockResolvedValueOnce([]);
      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('POST e DELETE - Mutações no Rate Limit', () => {
    it('POST: deve adicionar o IP na whitelist, remover dos bloqueados e gravar log', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: { ip: '1.2.3.4' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(mockSadd).toHaveBeenCalledWith('rate_limit:whitelist', '1.2.3.4');
      expect(mockDel).toHaveBeenCalledWith('rate_limit:1.2.3.4');
      expect(mockLpush).toHaveBeenCalled();
    });

    it('DELETE: deve remover da whitelist se type=whitelist', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', query: { ip: '1.2.3.4', type: 'whitelist' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(mockSrem).toHaveBeenCalledWith('rate_limit:whitelist', '1.2.3.4');
    });

    it('DELETE: deve remover do bloqueio manual se type for omitido', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', query: { ip: '1.2.3.4' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(mockDel).toHaveBeenCalledWith('rate_limit:1.2.3.4');
    });
  });

  describe('Erros Gerais', () => {
    it('deve retornar 500 se o Redis falhar', async () => {
      mockKeys.mockRejectedValueOnce(new Error('Redis crash'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });
});