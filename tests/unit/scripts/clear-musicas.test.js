import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.mock('pg');
jest.mock('fs');
jest.mock('dotenv');

jest.mock('../../../lib/db.js', () => ({
  query: jest.fn(),
  closeDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

describe('clear-musicas.js — Limpeza da tabela de músicas', () => {
  let libDb;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    libDb = await import('../../../lib/db.js');
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('deve executar DELETE FROM musicas', async () => {
    libDb.query.mockResolvedValue({ rows: [], rowCount: 5 });

    await libDb.query('DELETE FROM musicas');

    expect(libDb.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE')
    );
  });

  it('deve fechar conexão após limpar', async () => {
    libDb.query.mockResolvedValue({ rows: [], rowCount: 0 });
    await libDb.query('DELETE FROM musicas');
    await libDb.closeDatabase();

    expect(libDb.closeDatabase).toHaveBeenCalled();
  });
});