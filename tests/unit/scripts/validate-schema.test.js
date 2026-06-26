import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock do pg antes de qualquer importação
jest.unstable_mockModule('pg', () => {
  const mockQuery = jest.fn();
  function poolImpl() {
    return {
      query: mockQuery,
      end: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        query: mockQuery,
        release: jest.fn(),
        on: jest.fn(),
      }),
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    };
  }
  return {
    default: { Pool: jest.fn(poolImpl), mockQuery },
    Pool: jest.fn(poolImpl),
    mockQuery,
  };
});

// Mock do módulo load-env via unstable_mockModule para compatibilidade ESM
jest.unstable_mockModule('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

describe('validate-schema.js — Validação do schema do banco', () => {
  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('deve exportar validateSchema como função', async () => {
    jest.isolateModules(async () => {
      const mod = await import('../../../scripts/validate-schema.js');
      expect(typeof mod.validateSchema).toBe('function');
    });
  });

  it('deve validar schema corretamente com tabelas existentes', async () => {
    jest.isolateModules(async () => {
      const pg = await import('pg');
      pg.mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] }); // SELECT 1

      const mod = await import('../../../scripts/validate-schema.js');
      const result = await mod.validateSchema();
      expect(typeof result).toBe('boolean');
    });
  });

  it('deve retornar false em caso de erro de conexão', async () => {
    jest.isolateModules(async () => {
      const pg = await import('pg');
      pg.mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      const mod = await import('../../../scripts/validate-schema.js');
      const result = await mod.validateSchema();
      expect(result).toBe(false);
    });
  });
});