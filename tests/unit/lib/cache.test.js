import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mocks das funções importadas de redis.js
// NOTA: jest.mock é hoisted (elevado) ao topo, por isso usamos
// funções inline em vez de variáveis declaradas depois.

jest.mock('../../../lib/redis.js', () => {
  const mockRedisGet = jest.fn();
  const mockRedisSet = jest.fn();
  const mockRedisDel = jest.fn();
  const mockRedisScan = jest.fn();
  const mockRedisIncr = jest.fn();
  const mockRedisExpire = jest.fn();
  const mockRedisFlushdb = jest.fn();
  const mockCheckRedisHealth = jest.fn();
  const mockGetRedisInstance = jest.fn();

  return {
    __esModule: true,
    _mockRedisGet: mockRedisGet,
    _mockRedisSet: mockRedisSet,
    _mockRedisDel: mockRedisDel,
    _mockRedisScan: mockRedisScan,
    _mockRedisIncr: mockRedisIncr,
    _mockRedisExpire: mockRedisExpire,
    _mockRedisFlushdb: mockRedisFlushdb,
    _mockCheckRedisHealth: mockCheckRedisHealth,
    _mockGetRedisInstance: mockGetRedisInstance,
    get redis() { return mockGetRedisInstance() ? {} : null; },
    getRedisInstance: mockGetRedisInstance,
    redisGet: mockRedisGet,
    redisSet: mockRedisSet,
    redisDel: mockRedisDel,
    redisScan: mockRedisScan,
    redisIncr: mockRedisIncr,
    redisExpire: mockRedisExpire,
    redisFlushdb: mockRedisFlushdb,
    checkRedisHealth: mockCheckRedisHealth,
  };
});

jest.mock('../../../lib/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

// Referências para os mocks serão obtidas via require manual
let mockRedisGet, mockRedisSet, mockRedisDel, mockRedisScan;
let mockRedisIncr, mockRedisExpire, mockRedisFlushdb, mockGetRedisInstance;

import { jest as jestObj } from '@jest/globals';
import {
  getOrSetCache,
  invalidateCache,
  clearAllCache,
  checkRateLimit,
  getCacheMetrics,
  cleanupRateLimitTimer,
} from '../../../lib/cache.js';

describe('Library - Cache & Rate Limit', () => {
  beforeAll(() => {
    const redisMock = jest.requireMock('../../../lib/redis.js');
    mockRedisGet = redisMock._mockRedisGet;
    mockRedisSet = redisMock._mockRedisSet;
    mockRedisDel = redisMock._mockRedisDel;
    mockRedisScan = redisMock._mockRedisScan;
    mockRedisIncr = redisMock._mockRedisIncr;
    mockRedisExpire = redisMock._mockRedisExpire;
    mockRedisFlushdb = redisMock._mockRedisFlushdb;
    mockGetRedisInstance = redisMock._mockGetRedisInstance;
  });

  beforeEach(() => {
    jestObj.clearAllMocks();
    // Por padrão, Redis está conectado
    mockGetRedisInstance.mockReturnValue({});
  });

  afterEach(() => {
    cleanupRateLimitTimer();
  });

  // ─── getOrSetCache ───────────────────────────────────────────────

  describe('getOrSetCache', () => {
    it('retorna do cache em memória (L1) se existir (Memory Hit)', async () => {
      // Primeira chamada: popula cache
      mockRedisGet.mockResolvedValue(null);
      const fetchFn = jest.fn().mockResolvedValue({ data: 'test' });
      await getOrSetCache('mem-key', fetchFn, 3600);

      // Segunda chamada: deve vir da memória (L1), sem chamar Redis ou fetch
      mockRedisGet.mockClear();
      const fetchFn2 = jest.fn();
      const data = await getOrSetCache('mem-key', fetchFn2, 3600);

      expect(data).toEqual({ data: 'test' });
      expect(mockRedisGet).not.toHaveBeenCalled();
      expect(fetchFn2).not.toHaveBeenCalled();
    });

    it('retorna do Redis (L2) se não estiver na memória (Redis Hit)', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify({ cached: true }));
      const fetchFn = jest.fn();

      const data = await getOrSetCache('redis-hit-key', fetchFn);

      expect(data).toEqual({ cached: true });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('chama fetchFunction se não houver cache (Cache Miss) e salva no Redis', async () => {
      mockRedisGet.mockResolvedValue(null);
      const fetchFn = jest.fn().mockResolvedValue({ db: true });

      const data = await getOrSetCache('miss-key', fetchFn);

      expect(data).toEqual({ db: true });
      expect(mockRedisSet).toHaveBeenCalledWith('miss-key', JSON.stringify({ db: true }), 3600);
    });

    it('faz fallback para fetch se o Redis falhar (GET error)', async () => {
      mockRedisGet.mockRejectedValueOnce(new Error('Redis Timeout GET'));
      const fetchFn = jest.fn().mockResolvedValue({ db: true });

      const data = await getOrSetCache('err-key', fetchFn);

      expect(data).toEqual({ db: true });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('captura e loga erro no redis.set e retorna o dado normalmente', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockRedisSet.mockRejectedValueOnce(new Error('Redis SET Error'));
      const fetchFn = jest.fn().mockResolvedValue({ db: true });

      const data = await getOrSetCache('set-err-key', fetchFn);

      expect(data).toEqual({ db: true });
    });

    it('faz bypass total se o Redis não estiver instanciado', async () => {
      mockGetRedisInstance.mockReturnValue(null);
      const fetchFn = jest.fn().mockResolvedValue({ bypass: true });

      const data = await getOrSetCache('no-redis-key', fetchFn);

      expect(data).toEqual({ bypass: true });
    });

    it('usa Single-Flight quando múltiplas chamadas concorrentes pedem a mesma chave', async () => {
      mockRedisGet.mockResolvedValue(null);
      let callCount = 0;
      const fetchFn = jest.fn().mockImplementation(async () => {
        callCount++;
        // Simula operação demorada (ex: consulta ao banco)
        await new Promise(r => setTimeout(r, 50));
        return { data: 'from-db', call: callCount };
      });

      // Dispara 3 chamadas concorrentes para a mesma chave
      const [r1, r2, r3] = await Promise.all([
        getOrSetCache('single-flight-key', fetchFn),
        getOrSetCache('single-flight-key', fetchFn),
        getOrSetCache('single-flight-key', fetchFn),
      ]);

      // Apenas 1 fetch deve ser executado
      expect(callCount).toBe(1);
      expect(r1).toEqual({ data: 'from-db', call: 1 });
      expect(r2).toEqual({ data: 'from-db', call: 1 });
      expect(r3).toEqual({ data: 'from-db', call: 1 });
    });
  });

  // ─── invalidateCache ─────────────────────────────────────────────

  describe('invalidateCache', () => {
    it('deleta chave exata do Redis', async () => {
      mockRedisGet.mockResolvedValue(null);

      await invalidateCache('chave-exata');

      expect(mockRedisDel).toHaveBeenCalledWith('chave-exata');
    });

    it('usa SCAN para deletar múltiplas chaves com wildcard', async () => {
      mockRedisScan
        .mockResolvedValueOnce(['1', ['key:1', 'key:2']])
        .mockResolvedValueOnce(['0', ['key:3']]);

      await invalidateCache('key:*');

      expect(mockRedisScan).toHaveBeenCalled();
      expect(mockRedisDel).toHaveBeenCalledWith('key:1', 'key:2', 'key:3');
    });

    it('faz bypass se o Redis não estiver instanciado', async () => {
      mockGetRedisInstance.mockReturnValue(null);

      await invalidateCache('key');

      expect(mockRedisDel).not.toHaveBeenCalled();
    });
  });

  // ─── clearAllCache ───────────────────────────────────────────────

  describe('clearAllCache', () => {
    it('lança erro se confirmação não for fornecida', async () => {
      await expect(clearAllCache()).rejects.toThrow(
        'Operação FLUSHDB requer confirmação explícita'
      );
    });

    it('lança erro se confirm for false', async () => {
      await expect(clearAllCache({ confirm: false })).rejects.toThrow(
        'Operação FLUSHDB requer confirmação explícita'
      );
    });

    it('executa FLUSHDB quando confirm é true', async () => {
      const result = await clearAllCache({ confirm: true });

      expect(mockRedisFlushdb).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('não lança erro quando flushdb falha — retorna indicador de falha', async () => {
      mockRedisFlushdb.mockRejectedValueOnce(new Error('Redis falhou'));

      const result = await clearAllCache({ confirm: true });

      expect(result).toEqual({ success: false, error: 'Redis falhou' });
    });

    it('retorna fromMemory se Redis não estiver conectado', async () => {
      mockGetRedisInstance.mockReturnValue(null);

      const result = await clearAllCache({ confirm: true });

      expect(result).toEqual({ success: true, fromMemory: true });
      expect(mockRedisFlushdb).not.toHaveBeenCalled();
    });
  });

  // ─── checkRateLimit ──────────────────────────────────────────────

  describe('checkRateLimit', () => {
    it('usa Redis e permite requisições dentro do limite', async () => {
      mockRedisIncr.mockResolvedValueOnce(1);

      const limited = await checkRateLimit('200.200.0.1', 'api', 10, 60000);

      expect(limited).toBe(false);
      expect(mockRedisExpire).toHaveBeenCalledWith(
        'ratelimit:api:200.200.0.1',
        60,
        'NX'
      );
    });

    it('bloqueia quando excede o limite no Redis', async () => {
      mockRedisIncr.mockResolvedValueOnce(11);

      const limited = await checkRateLimit('200.200.0.2', 'api', 10, 60000);

      expect(limited).toBe(true);
    });

    it('usa fallback em memória quando Redis falha', async () => {
      mockRedisIncr.mockRejectedValue(new Error('Redis offline'));

      // Primeira chamada: cria entrada no Map (limite 0 → já excede)
      const r1 = await checkRateLimit('200.200.0.3', 'fallback', 0, 60000);
      expect(r1).toBe(true);
    });

    it('usa fallback em memória quando Redis não está instanciado', async () => {
      mockGetRedisInstance.mockReturnValue(null);

      const limited = await checkRateLimit('200.200.0.4', 'mem-only', 10, 60000);

      expect(limited).toBe(false); // 1o acesso, abaixo do limite
    });

    it('whitelist permanente funciona corretamente', async () => {
      const whitelistIPs = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'];

      for (const ip of whitelistIPs) {
        expect(await checkRateLimit(ip, 'test', 0)).toBe(false);
      }
    });

    it('whitelist dinâmica para IPs privados funciona', async () => {
      const privateIPs = ['10.0.0.1', '172.16.0.1', '172.31.0.1', '192.168.1.1'];

      for (const ip of privateIPs) {
        expect(await checkRateLimit(ip, 'private', 0)).toBe(false);
      }
    });

    it('rate limit dinâmico com função de limite funciona', async () => {
      mockRedisIncr.mockResolvedValueOnce(5);

      const dynamicLimit = (ip) => (ip === '200.200.0.1' ? 10 : 5);
      const limited = await checkRateLimit('200.200.0.1', 'dynamic', dynamicLimit, 60000);

      expect(limited).toBe(false); // 5 <= 10
    });

    it('rate limit dinâmico bloqueia corretamente', async () => {
      mockRedisIncr.mockResolvedValueOnce(6);

      const dynamicLimit = (ip) => (ip === '200.200.0.1' ? 5 : 10);
      const limited = await checkRateLimit('200.200.0.1', 'dynamic-block', dynamicLimit, 60000);

      expect(limited).toBe(true); // 6 > 5
    });

    it('bypass completo quando DISABLE_RATE_LIMIT=true', async () => {
      const originalVal = process.env.DISABLE_RATE_LIMIT;
      process.env.DISABLE_RATE_LIMIT = 'true';

      const limited = await checkRateLimit('evil-ip', 'bypass', 0, 60000);

      expect(limited).toBe(false);
      expect(mockRedisIncr).not.toHaveBeenCalled();

      process.env.DISABLE_RATE_LIMIT = originalVal;
    });

    it('lazy eviction funciona sem crash quando entrada expira', async () => {
      mockGetRedisInstance.mockReturnValue(null);

      // Cria uma primeira entrada com limite 10 — deve passar
      const r1 = await checkRateLimit('200.200.0.5', 'lazy', 10, 60000);
      expect(r1).toBe(false);

      // Segunda chamada imediata — count=2, ainda abaixo do limite
      const r2 = await checkRateLimit('200.200.0.5', 'lazy', 10, 60000);
      expect(r2).toBe(false);
    });
  });

  // ─── getCacheMetrics ─────────────────────────────────────────────

  describe('getCacheMetrics', () => {
    it('retorna estrutura de métricas completa', () => {
      const metrics = getCacheMetrics();

      expect(metrics).toHaveProperty('redisHits');
      expect(metrics).toHaveProperty('redisMisses');
      expect(metrics).toHaveProperty('redisErrors');
      expect(metrics).toHaveProperty('memoryHits');
      expect(metrics).toHaveProperty('memoryMisses');
      expect(metrics).toHaveProperty('fallbackActivations');
      expect(metrics).toHaveProperty('lastFallbackTime');
      expect(metrics).toHaveProperty('totalGetOrSetCalls');
      expect(metrics).toHaveProperty('singleFlightHits');
      expect(metrics).toHaveProperty('localMapSize');
      expect(metrics).toHaveProperty('memoryCacheSize');
      expect(metrics).toHaveProperty('redisConnected');
    });

    it('redisConnected reflete estado da conexão', () => {
      mockGetRedisInstance.mockReturnValue({});
      let metrics = getCacheMetrics();
      expect(metrics.redisConnected).toBe(true);

      mockGetRedisInstance.mockReturnValue(null);
      metrics = getCacheMetrics();
      expect(metrics.redisConnected).toBe(false);
    });

    it('incrementa redisHits em cache hit no Redis', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify({ data: 1 }));
      await getOrSetCache('metrics-hit', jest.fn());

      const metrics = getCacheMetrics();
      expect(metrics.redisHits).toBeGreaterThanOrEqual(1);
    });

    it('incrementa redisMisses em cache miss', async () => {
      mockRedisGet.mockResolvedValue(null);
      const fetchFn = jest.fn().mockResolvedValue({ data: 1 });
      await getOrSetCache('metrics-miss', fetchFn);

      const metrics = getCacheMetrics();
      expect(metrics.redisMisses).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Single-Flight (inflightPromises) ────────────────────────────

  describe('Single-Flight (request coalescing)', () => {
    it('incrementa singleFlightHits quando promise já existe', async () => {
      mockRedisGet.mockResolvedValue(null);
      const fetchFn = jest.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 50));
        return { data: 'expensive' };
      });

      const [r1] = await Promise.all([
        getOrSetCache('sf-metrics-key', fetchFn),
        getOrSetCache('sf-metrics-key', fetchFn),
        getOrSetCache('sf-metrics-key', fetchFn),
      ]);

      const metrics = getCacheMetrics();
      expect(metrics.singleFlightHits).toBeGreaterThanOrEqual(2);
      expect(r1).toEqual({ data: 'expensive' });
    });
  });
});