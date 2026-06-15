import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('@upstash/redis', () => ({
  Redis: function(config) {
    return config;
  }
}));

describe('Library - Redis', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('deve exportar null como valor padrão de redis (inicialização lazy)', () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    
    const { redis } = require('../../../lib/redis.js');
    expect(redis).toBeNull();
  });

  it('getRedisInstance() deve retornar null se as variáveis não estiverem definidas', () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    
    const { getRedisInstance } = require('../../../lib/redis.js');
    const instance = getRedisInstance();
    expect(instance).toBeNull();
  });

  it('getRedisInstance() deve retornar instância do Redis se as variáveis estiverem definidas', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

    const { getRedisInstance } = require('../../../lib/redis.js');
    const instance = getRedisInstance();
    expect(instance).toBeDefined();
    expect(instance.url).toBe('https://fake-redis.com');
  });
});
