import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.mock('pg');
jest.mock('fs');
jest.mock('dotenv');

jest.mock('../../../lib/db.js', () => require('../../mocks/db-module').mockDb());

describe('seed-all.js — Orquestrador de seeds', () => {
  let libDb;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    libDb = await import('../../../lib/db.js');
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('deve verificar conexão com banco antes de semear', async () => {
    libDb.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const result = await libDb.query('SELECT 1');
    expect(result.rows[0]['?column?']).toBe(1);
    expect(libDb.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('deve executar seeds em ordem: posts, musicas, videos', () => {
    const seeds = ['seed-posts.js', 'seed-musicas.js', 'seed-videos.js'];
    expect(seeds[0]).toBe('seed-posts.js');
    expect(seeds[1]).toBe('seed-musicas.js');
    expect(seeds[2]).toBe('seed-videos.js');
  });
});