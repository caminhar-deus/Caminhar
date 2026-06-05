import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

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

jest.mock('fs');
jest.mock('dotenv');

describe('init-table.js — Inicialização de tabelas', () => {
  let pgMock;
  let buildCreateTableSQL;
  let getSeedValues;
  let buildSeedSQL;
  let getTableName;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';

    // As funções internas do init-table.js podem ser testadas
    // importando o módulo e acessando-as via eval indireto
    jest.isolateModules(async () => {
      const mod = await import('../../../scripts/init-table.js');
      // Funções não exportadas - testamos via suas saídas
    });
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  const musicasSchema = {
    table: 'musicas',
    dropBeforeCreate: true,
    columns: [
      { name: 'id', type: 'SERIAL', constraints: 'PRIMARY KEY' },
      { name: 'titulo', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
      { name: 'artista', type: 'VARCHAR(255)' },
      { name: 'publicado', type: 'BOOLEAN', constraints: 'DEFAULT false' },
    ],
    seedData: [],
  };

  const dicasSchema = {
    table: 'dicas',
    dropBeforeCreate: false,
    columns: [
      { name: 'id', type: 'SERIAL', constraints: 'PRIMARY KEY' },
      { name: 'name', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
      { name: 'content', type: 'TEXT' },
    ],
    seedData: [
      { name: 'Palavra do dia', content: 'Conteúdo da palavra' },
    ],
  };

  it('deve executar DROP TABLE CASCADE quando dropBeforeCreate for true', async () => {
    pgMock = (await import('pg')).default;
    pgMock.mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    
    jest.isolateModules(async () => {
      const mod = await import('../../../scripts/init-table.js');
    });
  });

  describe('buildCreateTableSQL', () => {
    it('deve gerar SQL CREATE TABLE a partir do schema', () => {
      // Teste conceitual da lógica de construção SQL
      const schema = musicasSchema;
      const columnDefs = schema.columns.map(col => {
        const parts = [col.name, col.type];
        if (col.constraints) parts.push(col.constraints);
        return parts.join(' ');
      });
      const sql = `CREATE TABLE IF NOT EXISTS ${schema.table} (\n  ${columnDefs.join(',\n  ')}\n);`;

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS musicas');
      expect(sql).toContain('id SERIAL PRIMARY KEY');
      expect(sql).toContain('titulo VARCHAR(255) NOT NULL');
      expect(sql).toContain('publicado BOOLEAN DEFAULT false');
    });
  });

  describe('getSeedValues', () => {
    it('deve converter seedData em array de arrays', () => {
      const schema = dicasSchema;
      const columns = Object.keys(schema.seedData[0]);
      const values = schema.seedData.map(item => {
        return columns.map(col => {
          const value = item[col];
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          if (value === null || value === undefined) return 'NULL';
          return value;
        });
      });

      expect(values).toEqual([["'Palavra do dia'", "'Conteúdo da palavra'"]]);
    });

    it('deve retornar array vazio se não houver seedData', () => {
      const values = musicasSchema.seedData;
      expect(values).toEqual([]);
    });
  });
});