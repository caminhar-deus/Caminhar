import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock compacto: a mesma instância é reaproveitada mesmo após jest.resetModules()
const mockRedisCtor = jest.fn();
jest.mock('@upstash/redis', () => ({ Redis: mockRedisCtor }));

jest.mock('../../../../lib/infra/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

/**
 * Carrega um módulo "fresco" do redis.js, isolando o estado
 * singleton (initializationAttempted, redisInstance, memoryCache).
 */
async function loadFreshRedis() {
  jest.resetModules();
  return await import('../../../../lib/infra/redis.js');
}

describe('Infra - Redis (lib/infra/redis.js)', () => {
  const savedEnv = {};

  beforeAll(() => {
    savedEnv.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
    savedEnv.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    savedEnv.REDIS_URL = process.env.REDIS_URL;
  });

  afterAll(() => {
    for (const key of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'REDIS_URL']) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.REDIS_URL;
  });

  it('deve usar o fallback em memória quando não houver Redis configurado', async () => {
    const redis = await loadFreshRedis();

    await redis.redisSet('chave', 'valor');
    await expect(redis.redisGet('chave')).resolves.toBe('valor');
    await expect(redis.redisScan('0', {})).resolves.toEqual(['0', []]);
    await expect(redis.redisIncr('contador')).resolves.toBe(1);
    await expect(redis.redisIncr('contador')).resolves.toBe(2);
    await redis.redisExpire('chave', 60);
    await redis.redisDel('chave');
    await expect(redis.redisGet('chave')).resolves.toBeNull();
    await expect(redis.redisFlushdb()).resolves.toEqual({ success: true });
    expect(redis.getRedisInstance()).toBeNull();
    expect(mockRedisCtor).not.toHaveBeenCalled();
  });

  it('deve inicializar o Redis Upstash e delegar as operações quando configurado', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tokenteste123';

    const mockInstance = {
      get: jest.fn(async () => 'valor-remoto'),
      set: jest.fn(async () => 'OK'),
      del: jest.fn(async () => 1),
      scan: jest.fn(async () => ['0', ['a']]),
      incr: jest.fn(async () => 5),
      expire: jest.fn(async () => 1),
      flushdb: jest.fn(async () => 'OK'),
    };
    const { Redis } = await import('@upstash/redis');
    Redis.mockImplementation(() => mockInstance);

    const redis = await loadFreshRedis();

    const instance = redis.getRedisInstance();
    expect(instance).toBe(mockInstance);
    expect(Redis).toHaveBeenCalledWith({
      url: 'https://upstash.example.com',
      token: 'tokenteste123',
      automaticDeserialization: false,
    });

    await expect(redis.redisGet('chave')).resolves.toBe('valor-remoto');
    await redis.redisSet('chave', 'valor');
    expect(mockInstance.set).toHaveBeenCalledWith('chave', 'valor', { ex: 3600 });
    await redis.redisDel('chave');
    await expect(redis.redisScan('0', { count: 10 })).resolves.toEqual(['0', ['a']]);
    await expect(redis.redisIncr('c')).resolves.toBe(5);
    await redis.redisExpire('chave', 60, 'NX');
    await expect(redis.redisFlushdb()).resolves.toEqual({ success: true });
  });

  it('deve usar cache em memória quando a URL do Upstash for inválida', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'http://invalido'; // não começa com https://
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tokenteste123';

    const redis = await loadFreshRedis();
    expect(redis.getRedisInstance()).toBeNull();
  });

  it('deve usar cache em memória quando houver apenas REDIS_URL (protocolo redis://)', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    const redis = await loadFreshRedis();
    expect(redis.getRedisInstance()).toBeNull();
  });

  it('clearRedisMemoryCache deve limpar chave exata, padrão com wildcard e limpeza total', async () => {
    const redis = await loadFreshRedis();

    await redis.redisSet('dicas:1', 'v1');
    await redis.redisSet('dicas:2', 'v2');
    await redis.redisSet('posts:1', 'p1');

    redis.clearRedisMemoryCache('dicas:1');
    await expect(redis.redisGet('dicas:1')).resolves.toBeNull();
    await expect(redis.redisGet('dicas:2')).resolves.toBe('v2');

    redis.clearRedisMemoryCache('dicas:*');
    await expect(redis.redisGet('dicas:2')).resolves.toBeNull();
    await expect(redis.redisGet('posts:1')).resolves.toBe('p1');

    redis.clearRedisMemoryCache();
    await expect(redis.redisGet('posts:1')).resolves.toBeNull();
  });

  it('closeRedis não deve inicializar cliente quando inativo e deve lidar com ausência ou presença de quit()', async () => {
    // Caso 1: sem inicialização prévia, closeRedis não cria instância mesmo com variáveis definidas
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tokenteste123';
    const { Redis } = await import('@upstash/redis');

    let redis = await loadFreshRedis();
    await redis.closeRedis();
    expect(mockRedisCtor).not.toHaveBeenCalled();

    // Caso 2: cliente REST real (@upstash/redis sem .quit())
    const restMockInstance = { get: jest.fn(), set: jest.fn() };
    Redis.mockImplementationOnce(() => restMockInstance);
    redis = await loadFreshRedis();
    expect(redis.getRedisInstance()).toBe(restMockInstance);
    await expect(redis.closeRedis()).resolves.toBeUndefined();

    // Caso 3: cliente com .quit() (ex.: mock ou cliente compatível) tem quit() chamado
    const quitMock = jest.fn(async () => {});
    const tcpMockInstance = { quit: quitMock };
    Redis.mockImplementationOnce(() => tcpMockInstance);
    expect(redis.getRedisInstance()).toBe(tcpMockInstance);
    await redis.closeRedis();
    expect(quitMock).toHaveBeenCalledTimes(1);
  });
});