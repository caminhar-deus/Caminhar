import { jest, describe, it, expect } from '@jest/globals';
import {
  buildCreateTableSQL,
  getSeedValues,
  buildSeedSQL,
  getTableName,
  validateIdentifier
} from '../../../scripts/utils/init-table-utils.js';

describe('init-table-utils — buildCreateTableSQL', () => {
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

  it('deve gerar SQL CREATE TABLE a partir do schema', () => {
    const safeName = validateIdentifier('musicas', 'nome da tabela');
    const sql = buildCreateTableSQL(musicasSchema, safeName);

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS musicas');
    expect(sql).toContain('id SERIAL PRIMARY KEY');
    expect(sql).toContain('titulo VARCHAR(255) NOT NULL');
    expect(sql).toContain('publicado BOOLEAN DEFAULT false');
  });
});

describe('init-table-utils — getSeedValues', () => {
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

  it('deve converter seedData em array de arrays', () => {
    const values = getSeedValues(dicasSchema);
    expect(values).toEqual([["'Palavra do dia'", "'Conteúdo da palavra'"]]);
  });

  it('deve retornar array vazio se não houver seedData', () => {
    const values = getSeedValues(musicasSchema);
    expect(values).toEqual([]);
  });
});

describe('init-table-utils — buildSeedSQL', () => {
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

  const musicasSchema = {
    table: 'musicas',
    columns: [
      { name: 'id', type: 'SERIAL', constraints: 'PRIMARY KEY' },
      { name: 'titulo', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
    ],
    seedData: [],
  };

  it('deve gerar SQL INSERT a partir de seedData', () => {
    const safeName = validateIdentifier('dicas', 'nome da tabela');
    const sql = buildSeedSQL(dicasSchema, safeName);
    expect(sql).toContain('INSERT INTO dicas');
    expect(sql).toContain("'Palavra do dia'");
    expect(sql).toContain("'Conteúdo da palavra'");
  });

  it('deve retornar null se não houver seedData', () => {
    const safeName = validateIdentifier('musicas', 'nome da tabela');
    expect(buildSeedSQL(musicasSchema, safeName)).toBeNull();
  });
});

describe('init-table-utils — getTableName', () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('deve extrair nome da tabela do argumento posicional', () => {
    process.argv = ['node', 'init-table.js', 'musicas'];
    expect(getTableName()).toBe('musicas');
  });

  it('deve extrair nome da tabela de --table=valor', () => {
    process.argv = ['node', 'init-table.js', '--table=posts'];
    expect(getTableName()).toBe('posts');
  });

  it('deve extrair nome da tabela de --table valor', () => {
    process.argv = ['node', 'init-table.js', '--table', 'videos'];
    expect(getTableName()).toBe('videos');
  });

  it('deve lançar erro se nenhum argumento for fornecido', () => {
    process.argv = ['node', 'init-table.js'];
    expect(() => getTableName()).toThrow(/Uso:/);
  });
});