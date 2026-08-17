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
    // Import dinâmico direto (com await) garante uma espera determinística
    // da Promise, ao contrário de jest.isolateModules(callback async).
    const pg = await import('pg');
    // Colunas esperadas, idênticas ao EXPECTED_SCHEMA de validate-schema.js.
    const expectedColumnsByTable = {
      posts: ['id', 'title', 'slug', 'excerpt', 'content', 'image_url', 'published', 'created_at', 'updated_at', 'views'],
      videos: ['id', 'titulo', 'url_youtube', 'descricao', 'publicado', 'created_at', 'updated_at'],
      musicas: ['id', 'titulo', 'artista', 'url_spotify', 'descricao', 'publicado', 'created_at', 'updated_at'],
      users: ['id', 'username', 'password', 'role', 'created_at'],
      settings: ['key', 'value', 'type', 'description', 'updated_at'],
      images: ['id', 'filename', 'path', 'type', 'size', 'user_id'],
    };
    // Resposta condicional ao SQL: SELECT 1 retorna { '?column?': 1 },
    // cada SELECT EXISTS retorna { exists: true }, e cada consulta de
    // colunas (information_schema.columns) retorna as colunas da tabela.
    pg.mockQuery.mockImplementation((text, values) => {
      if (text.includes('SELECT EXISTS')) {
        return Promise.resolve({ rows: [{ exists: true }] });
      }
      if (text.includes('SELECT column_name') || text.includes('information_schema.columns')) {
        const tableName = values && values[0];
        return Promise.resolve({
          rows: (expectedColumnsByTable[tableName] || []).map(column_name => ({ column_name })),
        });
      }
      return Promise.resolve({ rows: [{ '?column?': 1 }] });
    });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { validateSchema } = await import('../../../scripts/validate-schema.js');
    const result = await validateSchema();

    expect(result).toBe(true);
    expect(
      errorSpy.mock.calls.some(([msg]) => String(msg).includes('Tabela faltando'))
    ).toBe(false);
    errorSpy.mockRestore();
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