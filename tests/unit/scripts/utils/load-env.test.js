import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('fs');
jest.mock('dotenv');

describe('load-env.js — Carregamento de ambiente', () => {
  let fs;
  let dotenv;
  let loadEnv;
  let requireDatabaseUrl;

  beforeAll(async () => {
    fs = await import('fs');
    dotenv = await import('dotenv');
    const mod = await import('../../../../scripts/utils/load-env.js');
    loadEnv = mod.loadEnv;
    requireDatabaseUrl = mod.requireDatabaseUrl;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  describe('loadEnv()', () => {
    it('deve carregar .env.local se existir', () => {
      fs.existsSync.mockReturnValue(true);

      loadEnv();

      expect(fs.existsSync).toHaveBeenCalledWith('.env.local');
      expect(dotenv.config).toHaveBeenCalledWith({ path: '.env.local' });
      expect(dotenv.config).toHaveBeenCalledTimes(2); // .env.local + .env
    });

    it('deve pular .env.local se não existir e carregar .env', () => {
      fs.existsSync.mockReturnValue(false);

      loadEnv();

      expect(dotenv.config).toHaveBeenCalledTimes(1); // apenas .env
    });
  });

  describe('requireDatabaseUrl()', () => {
    it('não deve lançar erro se DATABASE_URL estiver definida', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
      expect(() => requireDatabaseUrl()).not.toThrow();
    });

    it('deve lançar erro se DATABASE_URL não estiver definida', () => {
      expect(() => requireDatabaseUrl()).toThrow('DATABASE_URL não definida');
    });

    it('deve lançar erro se DATABASE_URL estiver vazia', () => {
      process.env.DATABASE_URL = '';
      expect(() => requireDatabaseUrl()).toThrow('DATABASE_URL não definida');
    });
  });
});