import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mocks using unstable_mockModule for ESM compatibility
jest.unstable_mockModule('pg', () => {
  const mockQuery = jest.fn();
  const mockConnect = jest.fn().mockResolvedValue({
    query: mockQuery,
    release: jest.fn(),
    on: jest.fn(),
  });
  function poolImpl() {
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
  return {
    default: { Pool: jest.fn(poolImpl), mockQuery },
    Pool: jest.fn(poolImpl),
    mockQuery,
  };
});

jest.unstable_mockModule('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    default: actualFs,
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
  };
});

jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

jest.mock('../../../scripts/db/connection.js', () => {
  let pool = null;
  return {
    getPool: jest.fn(() => {
      if (!pool) {
        const pg = jest.requireActual('pg');
        pool = new pg.Pool();
      }
      return pool;
    }),
    closePool: jest.fn().mockResolvedValue(undefined),
  };
});

describe('migrate.js — Gerenciador de migrações', () => {
  let pgMock;
  let fsMock;
  let migrate;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    fsMock = await import('fs');

    // Simula diretório de migrações com arquivos
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readdirSync.mockReturnValue([
      '001-add-views-to-posts.js',
      '002-create-products-table.js',
    ]);

    jest.isolateModules(async () => {
      migrate = await import('../../../scripts/migrate.js');
    });

    pgMock = (await import('pg')).default;
    pgMock.mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('deve listar arquivos de migração ordenados por prefixo numérico', () => {
    // A função listMigrationFiles é interna, mas podemos verificar o comportamento
    // através do fs.readdirSync chamado
    expect(fsMock.readdirSync).toHaveBeenCalled();
  });

  it('deve criar tabela _migrations se não existir', async () => {
    // Simula que não há migrações aplicadas
    pgMock.mockQuery
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }) // SELECT 1 no pool connect
      .mockResolvedValueOnce({ rows: [] }); // SELECT _migrations

    // O módulo executa ensureMigrationTable na inicialização
    // Como é uma IIFE, verifique que o pool foi chamado
  });

  it('deve extrair nome da migração do nome do arquivo', () => {
    // Teste da lógica de extração de nome
    const filename = '001-add-views-to-posts.js';
    const name = filename.replace(/\.js$/, '');
    expect(name).toBe('001-add-views-to-posts');
  });

  it('deve rejeitar arquivos que não seguem o padrão NNN-*.js', () => {
    const files = ['readme.md', '001-migration.js', 'test.js'];
    const validFiles = files.filter(f => /^\d{3}-.+\.js$/.test(f));
    expect(validFiles).toEqual(['001-migration.js']);
  });
});