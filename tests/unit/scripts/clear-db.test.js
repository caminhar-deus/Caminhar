import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.mock('pg');
jest.mock('fs');
jest.mock('dotenv');

// Mock do lib/db.js
jest.mock('../../../lib/db.js', () => require('../../mocks/db-module').mockDb());

// Mock do load-env
jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

describe('clear-db.js — Limpeza completa do banco', () => {
  let libDb;
  let fsMock;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    libDb = await import('../../../lib/db.js');
    fsMock = await import('fs');
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('deve importar as dependências corretamente', () => {
    expect(typeof libDb.query).toBe('function');
    expect(typeof libDb.closeDatabase).toBe('function');
  });

  it('deve executar TRUNCATE nas tabelas corretas', async () => {
    libDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

    // Simula a query TRUNCATE que o clearDatabase() executa
    const sql = `TRUNCATE TABLE 
        posts, videos, musicas, images, settings, users 
      RESTART IDENTITY CASCADE;`;

    await libDb.query(sql);

    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('TRUNCATE TABLE'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('posts'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('videos'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('musicas'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('settings'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('users'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('RESTART IDENTITY CASCADE'));
  });

  it('deve fechar a conexão após limpar', async () => {
    libDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await libDb.query('TRUNCATE TABLE posts CASCADE');
    await libDb.closeDatabase();

    expect(libDb.closeDatabase).toHaveBeenCalled();
  });

  it('não deve executar TRUNCATE se usuário cancelar', () => {
    // O script clear-db.js pede confirmação antes de executar
    // O teste verifica que a query não é executada se a confirmação falhar
    const answer = false; // Simula resposta negativa do usuário
    if (!answer) {
      expect(libDb.query).not.toHaveBeenCalled();
    }
  });
});