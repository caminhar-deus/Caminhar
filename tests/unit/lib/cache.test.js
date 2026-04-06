import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { getOrSetCache, invalidateCache, clearAllCache, checkRateLimit } from '../../../lib/cache.js';
import { redis } from '../../../lib/redis.js';

jest.mock('../../../lib/redis.js', () => ({
  redis: { get: jest.fn(), set: jest.fn(), del: jest.fn(), flushdb: jest.fn(), incr: jest.fn(), expire: jest.fn() }
}));

describe('Library - Cache & Rate Limit', () => {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    console.error = () => {};
    console.warn = () => {};
  });

  afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it('getOrSetCache: retorna do Redis se existir (Cache Hit)', async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify({ cached: true }));
    const data = await getOrSetCache('key', jest.fn());
    expect(data.cached).toBe(true);
  });

  it('getOrSetCache: busca dados e salva no cache se não existir (Cache Miss)', async () => {
    redis.get.mockResolvedValueOnce(null);
    const fetchFn = jest.fn().mockResolvedValue({ db: true });
    const data = await getOrSetCache('key', fetchFn);
    
    expect(data.db).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('key', JSON.stringify({ db: true }), { ex: 3600 });
  });

  it('getOrSetCache: faz fallback pro BD se o Redis falhar e ignora erros do SET silenciosamente', async () => {
    redis.get.mockRejectedValueOnce(new Error('Redis Timeout GET'));
    redis.set.mockRejectedValueOnce(new Error('Redis Timeout SET'));
    
    const data = await getOrSetCache('key', jest.fn().mockResolvedValue({ db: true }));
    expect(data.db).toBe(true);
  });

  it('invalidateCache e clearAllCache: repassam comandos de exclusão ao Redis', async () => {
    await invalidateCache('key');
    expect(redis.del).toHaveBeenCalledWith('key');
    
    await clearAllCache();
    expect(redis.flushdb).toHaveBeenCalled();
  });

  it('checkRateLimit: usa Redis e limita acessos quando atinge a cota', async () => {
    redis.incr.mockResolvedValueOnce(1); // Primeiro acesso
    expect(await checkRateLimit('127.0.0.1', 'auth', 2)).toBe(false);
    expect(redis.expire).toHaveBeenCalled();

    redis.incr.mockResolvedValueOnce(3); // Ultrapassou a cota
    expect(await checkRateLimit('127.0.0.1', 'auth', 2)).toBe(true);
  });

  it('checkRateLimit: usa Map em memória local como fallback se o Redis estiver offline', async () => {
    redis.incr.mockRejectedValue(new Error('Redis offline'));
    expect(await checkRateLimit('127.0.0.2', 'api', 0)).toBe(true); // Estoura limite local de 0
  });
});