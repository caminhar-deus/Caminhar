import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Referências compartilhadas entre mocks
const mockQuery = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({
  query: mockQuery,
  release: jest.fn(),
  on: jest.fn(),
});
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockPool = {
  query: mockQuery,
  end: mockEnd,
  on: jest.fn(),
  connect: mockConnect,
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
};

const mockReaddir = jest.fn();
const mockAccess = jest.fn();

jest.unstable_mockModule('pg', () => ({
  default: { Pool: jest.fn(() => mockPool) },
  Pool: jest.fn(() => mockPool),
}));

jest.mock('fs', () => ({
  promises: {
    readdir: mockReaddir,
    access: mockAccess,
  },
}));

jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

jest.mock('../../../scripts/db/connection.js', () => {
  let pool = null;
  return {
    getPool: jest.fn(() => {
      if (!pool) {
        pool = {
          query: mockQuery,
          end: mockEnd,
          on: jest.fn(),
          connect: mockConnect,
          totalCount: 0,
          idleCount: 0,
          waitingCount: 0,
        };
      }
      return pool;
    }),
    closePool: jest.fn().mockResolvedValue(undefined),
  };
});

describe('migrate.js — Gerenciador de migrações', () => {
  let migrate;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';

    // Sem isolateModules: o módulo tem CLI guard, então a IIFE não executa
    migrate = await import('../../../scripts/migrate.js');
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    jest.clearAllMocks();
  });

  describe('listMigrationFiles', () => {
    it('deve listar arquivos de migração ordenados por prefixo numérico', async () => {
      mockReaddir.mockResolvedValue([
        '002-create-products-table.js',
        '001-add-views-to-posts.js',
      ]);

      const files = await migrate.listMigrationFiles();

      expect(files).toEqual([
        '001-add-views-to-posts.js',
        '002-create-products-table.js',
      ]);
    });

    it('deve rejeitar arquivos que não seguem o padrão NNN-*.js', async () => {
      mockReaddir.mockResolvedValue([
        'readme.md',
        '001-migration.js',
        'test.js',
        '002-create-products-table.js',
      ]);

      const files = await migrate.listMigrationFiles();

      expect(files).toEqual([
        '001-migration.js',
        '002-create-products-table.js',
      ]);
    });
  });

  describe('migrationNameFromFile', () => {
    it('deve extrair nome da migração do nome do arquivo', () => {
      const name = migrate.migrationNameFromFile('001-add-views-to-posts.js');
      expect(name).toBe('001-add-views-to-posts');
    });
  });

  describe('ensureMigrationTable', () => {
    it('deve criar tabela _migrations se não existir', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await migrate.ensureMigrationTable(mockPool);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS _migrations')
      );
    });
  });

  describe('getAppliedMigrations', () => {
    it('deve retornar Set com nomes das migrações aplicadas', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { name: '001-add-views-to-posts' },
          { name: '002-create-products-table' },
        ],
      });

      const applied = await migrate.getAppliedMigrations(mockPool);

      expect(applied).toBeInstanceOf(Set);
      expect(applied.has('001-add-views-to-posts')).toBe(true);
      expect(applied.has('002-create-products-table')).toBe(true);
      expect(applied.has('003-not-applied')).toBe(false);
    });
  });
});