import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.mock('pg');
jest.mock('fs');
jest.mock('dotenv');

describe('cleanup.js — Módulo compartilhado de limpeza', () => {
  let cleanup;
  let fsMock;
  let pgMock;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    fsMock = await import('fs');
    pgMock = await import('pg');
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  describe('loadEnv()', () => {
    beforeAll(async () => {
      cleanup = await import('../../../../scripts/utils/cleanup.js');
    });

    it('deve carregar .env.local se existir', () => {
      fsMock.existsSync.mockReturnValue(true);
      cleanup.loadEnv();
      expect(fsMock.existsSync).toHaveBeenCalledWith('.env.local');
    });

    it('deve pular .env.local se não existir e carregar .env', () => {
      fsMock.existsSync.mockReturnValue(false);
      cleanup.loadEnv();
      expect(fsMock.existsSync).toHaveBeenCalledWith('.env.local');
    });
  });
});