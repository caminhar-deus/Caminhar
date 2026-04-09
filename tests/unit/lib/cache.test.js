import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { getOrSetCache, invalidateCache, clearAllCache, checkRateLimit } from '../../../lib/cache.js';

const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn(), flushdb: jest.fn(), incr: jest.fn(), expire: jest.fn() };
let mockSimulateNoRedis = false;

jest.mock('../../../lib/redis.js', () => {
  return {
    get redis() { return mockSimulateNoRedis ? null : mockRedis; }
  };
});

import { redis } from '../../../lib/redis.js';

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

  beforeEach(() => { 
    jest.clearAllMocks(); 
    mockSimulateNoRedis = false;
  });

  it('getOrSetCache: retorna do Redis se existir (Cache Hit)', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ cached: true }));
    const data = await getOrSetCache('key', jest.fn());
    expect(data.cached).toBe(true);
  });

  it('getOrSetCache: busca dados e salva no cache se não existir (Cache Miss)', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    const fetchFn = jest.fn().mockResolvedValue({ db: true });
    const data = await getOrSetCache('key', fetchFn);
    
    expect(data.db).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith('key', JSON.stringify({ db: true }), { ex: 3600 });
  });

  it('getOrSetCache: faz fallback pro BD se o Redis falhar e ignora erros do SET silenciosamente', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('Redis Timeout GET'));
    
    const data = await getOrSetCache('key', jest.fn().mockResolvedValue({ db: true }));
    expect(data.db).toBe(true);
  });

  it('getOrSetCache: captura e loga erro no redis.set e retorna o dado normalmente', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockRedis.set.mockRejectedValueOnce(new Error('Redis SET Error'));
    
    const data = await getOrSetCache('key_error_set', jest.fn().mockResolvedValue({ db: true }));
    expect(data.db).toBe(true);
  });

  it('getOrSetCache: faz bypass se o Redis não estiver instanciado', async () => {
    mockSimulateNoRedis = true;
    const data = await getOrSetCache('key_no_redis', jest.fn().mockResolvedValue({ bypass: true }));
    expect(data.bypass).toBe(true);
  });

  it('invalidateCache e clearAllCache: repassam comandos de exclusão ao Redis', async () => {
    await invalidateCache('key');
    expect(mockRedis.del).toHaveBeenCalledWith('key');
    
    await clearAllCache();
    expect(mockRedis.flushdb).toHaveBeenCalled();
  });

  it('invalidateCache e clearAllCache: fazem bypass se o Redis não estiver instanciado', async () => {
    mockSimulateNoRedis = true;
    await invalidateCache('key');
    await clearAllCache();
    expect(mockRedis.del).not.toHaveBeenCalled();
    expect(mockRedis.flushdb).not.toHaveBeenCalled();
  });

  it('checkRateLimit: usa Redis e limita acessos quando atinge a cota', async () => {
    mockRedis.incr.mockResolvedValueOnce(1); // Primeiro acesso
    expect(await checkRateLimit('127.0.0.1', 'auth', 2)).toBe(false);
    expect(mockRedis.expire).toHaveBeenCalled();

    mockRedis.incr.mockResolvedValueOnce(3); // Ultrapassou a cota
    expect(await checkRateLimit('127.0.0.1', 'auth', 2)).toBe(true);
  });

  it('checkRateLimit: usa Map em memória local como fallback se o Redis estiver offline', async () => {
    mockRedis.incr.mockRejectedValue(new Error('Redis offline'));
    expect(await checkRateLimit('127.0.0.2', 'api', 0)).toBe(true); // Estoura limite local de 0
  });

  it('checkRateLimit: faz bypass para in-memory se o Redis não estiver instanciado', async () => {
    mockSimulateNoRedis = true;
    expect(await checkRateLimit('127.0.0.3', 'api_no_redis', 0)).toBe(true); // Estoura limite local
  });
});