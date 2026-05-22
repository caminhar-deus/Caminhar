import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.unstable_mockModule('child_process', () => ({
  spawn: jest.fn(),
}));

jest.unstable_mockModule('fs', () => {
  const mockFs = {
    createReadStream: jest.fn(),
    createWriteStream: jest.fn(),
    promises: {
      mkdir: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      appendFile: jest.fn(),
      access: jest.fn(),
      unlink: jest.fn(),
      opendir: jest.fn(),
      stat: jest.fn(),
    },
  };
  return {
    default: { ...mockFs, createReadStream: mockFs.createReadStream, createWriteStream: mockFs.createWriteStream },
    ...mockFs,
    promises: mockFs.promises,
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
  };
});

jest.unstable_mockModule('date-fns', () => ({
  format: jest.fn(() => "2026-05-21'T'12-00-00'Z'"),
}));

// Use o caminho absoluto via moduleNameMapper do jest.config.js
jest.mock('../../../scripts/utils/constants.js', () => ({
  MAX_BACKUPS: 10,
  DEFAULT_LIST_LIMIT: 50,
  ENCRYPTION_KEY_LENGTH: 32,
  MAX_LOG_LINES: 100,
}));

describe('backup.js — Sistema de backup', () => {
  let backup;
  let mockFs;
  let mockSpawn;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';

    // Usa isolateModules para forçar o recarregamento limpo do módulo
    jest.isolateModules(async () => {
      backup = await import('../../../scripts/backup.js');
    });

    mockFs = await import('fs');
    mockSpawn = (await import('child_process')).spawn;
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  describe('Funções exportadas', () => {
    it('deve exportar createBackup como função', () => {
      expect(typeof backup.createBackup).toBe('function');
    });

    it('deve exportar restoreBackup como função', () => {
      expect(typeof backup.restoreBackup).toBe('function');
    });

    it('deve exportar cleanupOldBackups como função', () => {
      expect(typeof backup.cleanupOldBackups).toBe('function');
    });

    it('deve exportar getAvailableBackups como função', () => {
      expect(typeof backup.getAvailableBackups).toBe('function');
    });

    it('deve exportar getBackupLogs como função', () => {
      expect(typeof backup.getBackupLogs).toBe('function');
    });

    it('deve exportar initializeBackupSystem como função', () => {
      expect(typeof backup.initializeBackupSystem).toBe('function');
    });

  });
});