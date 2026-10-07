import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks the Redis instance methods
const mockSmembers = jest.fn();
const mockLrange = jest.fn();
const mockRedisScan = jest.fn();
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

jest.mock('../../../../lib/infra/redis.js', () => ({
  getRedisInstance: jest.fn(),
  redisGet: jest.fn(),
  redisSet: jest.fn(),
  redisDel: jest.fn(),
  redisScan: mockRedisScan,
  redisIncr: jest.fn(),
  redisExpire: jest.fn(),
  redisFlushdb: jest.fn(),
}));

// Mock do DB para controlar a query de roles do RBAC (createAdminHandler)
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());

jest.mock('../../../../lib/auth/auth.js', () => ({
  withAuth: jest.fn((h) => async (req, res) => {
    if (req.headers.authorization !== 'Bearer valid-token') {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    req.user = req._userOverride || { userId: 1, username: 'admin', role: 'admin' };
    return h(req, res);
  }),
}));

describe('API Admin - Rate Limit (/api/admin/rate-limit)', () => {
  let handler;
  const originalEnv = process.env;

  beforeAll(() => {
    // Define variáveis de ambiente simuladas ANTES de importar o módulo
    // Isso força o módulo a instanciar o objeto Redis real (mockado) e não cair no fallback Null
    process.env = { ...originalEnv, UPSTASH_REDIS_REST_URL: 'url', UPSTASH_REDIS_REST_TOKEN: 'token' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset do registro de módulos para zerar o cache em memória do endpoint
    // (BLOCKED_IPS_CACHE) entre os cenários
    jest.resetModules();
    const module = await import('../../../../pages/api/admin/rate-limit.js');
    handler = module.default;

    // O resetModules acima cria um NOVO módulo db.js a cada teste, então o
    // import estático apontaria para outra instância que a do handler.
    // Importamos de novo (mesmo registry) e devolvemos a permissão exigida
    // pelo recurso para que o caminho padrão seja de PERMISSÃO CONCEDIDA.
    const dbModule = await import('../../../../lib/infra/db.js');
    dbModule.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Segurança'] }] };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  const getAuthenticatedMocks = (options = {}, userOverride = null) => {
    const { req, res } = createMocks({
      ...options,
      headers: { ...options.headers, authorization: 'Bearer valid-token' },
    });
    if (userOverride) req._userOverride = userOverride;
    req.socket = { remoteAddress: '127.0.0.1' };
    return { req, res };
  };

  describe('Segurança e Autorização', () => {
    it('deve retornar 403 se o usuário não for admin e não tiver permissão', async () => {
      // O catch do adminCrudHandler também devolve 403 quando a query de roles
      // FALHA (fail-closed) — por isso este teste vem em par com o "allow"
      // logo abaixo: só o par prova que a negação aqui é por FALTA DE PERMISSÃO
      // e não por mock de banco no caminho errado.
      const dbModule = await import('../../../../lib/infra/db.js');
      dbModule.query.mockResolvedValueOnce({ rows: [{ permissions: ['Dashboard'] }] });

      const { req, res } = getAuthenticatedMocks({ method: 'GET', query: { type: 'current_ip' } }, { userId: 2, username: 'editor', role: 'comum' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      // `error` é igual nos dois caminhos de 403 (falta de permissão ×
      // fail-closed por falha de banco): só o `message` exigindo a permissão discrimina.
      const body = JSON.parse(res._getData());
      expect(body.error).toContain('Acesso negado');
      expect(body.message).toContain('Requer permissão');
    });

    it('não deve retornar 403 se o usuário não-admin tiver a permissão exigida', async () => {
      // Companheiro do teste acima: mesmo cargo 'comum', mas COM 'Segurança'.
      // Se o mock do banco estiver errado (query falhando/undefined), o fail-closed
      // devolveria 403 aqui e o teste quebraria — é isso que o par garante.
      const dbModule = await import('../../../../lib/infra/db.js');
      dbModule.query.mockResolvedValueOnce({ rows: [{ permissions: ['Segurança'] }] });

      const { req, res } = getAuthenticatedMocks({ method: 'GET', query: { type: 'current_ip' } }, { userId: 2, username: 'editor', role: 'comum' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).ip).toBe('127.0.0.1');
    });
  });

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

    it('deve listar IPs bloqueados combinando SCAN e pipeline', async () => {
      mockRedisScan.mockResolvedValueOnce(['0', ['rate_limit:10.0.0.5']]);
      mockPipelineExec.mockResolvedValueOnce([10, 3600]); // count=10 (excede limite), ttl=3600

      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())[0].ip).toBe('10.0.0.5');
    });
    
    it('deve retornar array vazio se não houver chaves', async () => {
      mockRedisScan.mockResolvedValueOnce(['0', []]);
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
      mockRedisScan.mockResolvedValueOnce(['0', ['rate_limit:10.0.0.5']]);
      mockPipelineExec.mockRejectedValueOnce(new Error('Redis crash'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });
});