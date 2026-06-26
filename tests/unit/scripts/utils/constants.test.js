import { describe, it, expect } from '@jest/globals';

describe('constants.js — Módulo de constantes compartilhadas', () => {
  let constants;

  beforeAll(async () => {
    constants = await import('../../../../scripts/utils/constants.js');
  });

  it('deve exportar MAX_BACKUPS = 10', () => {
    expect(constants.MAX_BACKUPS).toBe(10);
  });

  it('deve exportar DEFAULT_LIST_LIMIT = 50', () => {
    expect(constants.DEFAULT_LIST_LIMIT).toBe(50);
  });

  it('deve exportar BACKUP_INTERVAL_MS = 86400000', () => {
    expect(constants.BACKUP_INTERVAL_MS).toBe(86400000);
  });

  it('deve exportar ENCRYPTION_KEY_LENGTH = 32', () => {
    expect(constants.ENCRYPTION_KEY_LENGTH).toBe(32);
  });

  it('deve exportar MAX_LOG_LINES = 100', () => {
    expect(constants.MAX_LOG_LINES).toBe(100);
  });

  it('deve exportar DEFAULT_PORT = 3000', () => {
    expect(constants.DEFAULT_PORT).toBe(3000);
  });

  it('deve exportar SERVER_CHECK_TIMEOUT = 2000', () => {
    expect(constants.SERVER_CHECK_TIMEOUT).toBe(2000);
  });

  it('deve exportar POST_ALERT_THRESHOLD = 10', () => {
    expect(constants.POST_ALERT_THRESHOLD).toBe(10);
  });

  it('deve exportar DEFAULT_BATCH_SIZE = 50', () => {
    expect(constants.DEFAULT_BATCH_SIZE).toBe(50);
  });

  it('deve exportar MIGRATIONS_TABLE = "_migrations"', () => {
    expect(constants.MIGRATIONS_TABLE).toBe('_migrations');
  });

  it('deve exportar K6_RETENTION_DAYS = 7', () => {
    expect(constants.K6_RETENTION_DAYS).toBe(7);
  });

  it('não deve exportar valores undefined', () => {
    const exportedKeys = Object.keys(constants);
    const values = exportedKeys.map(key => constants[key]);
    expect(values.every(v => v !== undefined)).toBe(true);
  });
});