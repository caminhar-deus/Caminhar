import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock completo do pg antes de qualquer importação
jest.unstable_mockModule('pg', () => {
  const mockQuery = jest.fn();
  const mockConnect = jest.fn().mockResolvedValue({
    query: mockQuery,
    release: jest.fn(),
    on: jest.fn(),
  });

  function poolImplementation() {
    return {
      query: mockQuery,
      end: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      connect: mockConnect,
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    };
  }

  const Pool = jest.fn(poolImplementation);

  return {
    default: { Pool, mockQuery },
    Pool,
    mockQuery,
  };
});

describe('connection.js — Módulo de conexão PostgreSQL', () => {
  let connection;
  let pgMock;
  let originalDatabaseUrl;

  beforeAll(async () => {
    pgMock = await import('pg');
    connection = await import('../../../../scripts/db/connection.js');
  });

  beforeEach(() => {
    originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    connection.resetPool();
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  describe('getPool()', () => {
    it('deve criar um novo Pool se não existir', () => {
      const pool = connection.getPool();
      expect(pgMock.Pool).toHaveBeenCalledWith({
        connectionString: 'postgres://user:pass@localhost:5432/testdb',
      });
      expect(pool).toBeDefined();
    });

    it('deve lançar erro se DATABASE_URL não estiver definida', () => {
      delete process.env.DATABASE_URL;
      expect(() => connection.getPool()).toThrow('DATABASE_URL não definida');
    });

    it('deve retornar o mesmo Pool (singleton) em chamadas subsequentes', () => {
      const pool1 = connection.getPool();
      const pool2 = connection.getPool();
      expect(pool1).toBe(pool2);
      expect(pgMock.Pool).toHaveBeenCalledTimes(1);
    });
  });

  describe('closePool()', () => {
    it('deve fechar o pool e resetar para null', async () => {
      const pool = connection.getPool();
      await connection.closePool();
      expect(pool.end).toHaveBeenCalledTimes(1);
    });

    it('não deve lançar erro se pool for null', async () => {
      // Força o pool a null
      await connection.closePool();
      await expect(connection.closePool()).resolves.not.toThrow();
    });
  });

  describe('query()', () => {
    it('deve executar query via pool', async () => {
      pgMock.mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await connection.query('SELECT 1');
      expect(pgMock.mockQuery).toHaveBeenCalledWith('SELECT 1');
      expect(result.rows).toEqual([{ id: 1 }]);
    });

    it('deve executar query com parâmetros', async () => {
      pgMock.mockQuery.mockResolvedValue({ rows: [] });
      await connection.query('SELECT $1', ['teste']);
      expect(pgMock.mockQuery).toHaveBeenCalledWith('SELECT $1', ['teste']);
    });

    it('deve propagar erros do banco', async () => {
      pgMock.mockQuery.mockRejectedValue(new Error('Database error'));
      await expect(connection.query('SELECT * FROM nonexistent')).rejects.toThrow('Database error');
    });
  });
});