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

  it('deve exportar null se as variáveis de ambiente não estiverem definidas', () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    
    const { redis } = require('../../../lib/redis.js');
    expect(redis).toBeNull();
  });

  it('deve instanciar e exportar o Redis se as variáveis estiverem definidas', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

    const { redis } = require('../../../lib/redis.js');
    expect(redis).toBeDefined();
    expect(redis.url).toBe('https://fake-redis.com');
  });
});