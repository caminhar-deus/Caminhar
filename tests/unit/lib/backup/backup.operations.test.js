import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('child_process', () => ({ exec: jest.fn(), spawn: jest.fn() }));

jest.mock('zlib', () => ({
  createGzip: jest.fn(() => ({ pipe: jest.fn(dest => dest), on: jest.fn() })),
  createGunzip: jest.fn(() => ({ pipe: jest.fn(dest => dest), on: jest.fn() })),
}));

jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('abc123hash'),
  })),
  randomBytes: jest.fn(() => Buffer.alloc(12, 0xaa)),
  createCipheriv: jest.fn(() => ({
    update: jest.fn(() => Buffer.from('encrypted')),
    final: jest.fn(() => Buffer.from('final')),
    getAuthTag: jest.fn(() => Buffer.from('tag')),
  })),
}));

jest.mock('../../../../scripts/utils/date-format.js', () => ({
  formatISODate: jest.fn(() => '2026-01-15T02-00-00Z'),
  formatLogDate: jest.fn(() => '2026-01-15 02:00:00'),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn(),
  createReadStream: jest.fn(() => {
    let scheduled = false;
    const cbs = {};
    return {
      on(event, cb) {
        cbs[event] = cb;
        // Dispara apenas uma vez, quando ambos os listeners estiverem registrados
        if (cbs['data'] && cbs['end'] && !scheduled) {
          scheduled = true;
          process.nextTick(() => {
            if (cbs['data']) cbs['data'](Buffer.from('test'));
            if (cbs['end']) cbs['end']();
          });
        }
        return this;
      },
      pipe: jest.fn(dest => dest),
    };
  }),
  createWriteStream: jest.fn(() => ({
    on(event, cb) { if (event === 'finish') process.nextTick(cb); return this; },
    pipe: jest.fn(dest => dest),
  })),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
    opendir: jest.fn(),
    appendFile: jest.fn(),
  },
}));

import { createBackup, restoreBackup } from '../../../../scripts/backup.js';
import fs from 'fs';
import child_process from 'child_process';

function createAsyncDirIterator(files) {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next() {
          if (i < files.length) return Promise.resolve({ value: { name: files[i++], isFile: () => true }, done: false });
          return Promise.resolve({ value: undefined, done: true });
        }
      };
    }
  };
}

describe('Operações de Backup (lib/backup.js)', () => {
  const DATABASE_URL = 'postgresql://user:pass@host:5432/testdb';

  beforeEach(() => {
    process.env.DATABASE_URL = DATABASE_URL;
    jest.clearAllMocks();

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('');
    fs.statSync.mockReturnValue({ size: 1024 });
    fs.promises.access.mockResolvedValue();
    fs.promises.mkdir.mockResolvedValue();
    fs.promises.readFile.mockResolvedValue('');
    fs.promises.appendFile.mockResolvedValue();
    fs.promises.unlink.mockResolvedValue();
    fs.promises.writeFile.mockResolvedValue();

    child_process.spawn.mockReturnValue({
      stdout: { pipe: jest.fn(dest => dest), on: jest.fn() },
      stderr: { on: jest.fn() },
      stdin: { on: jest.fn() },
      on: jest.fn((ev, cb) => { if (ev === 'close') process.nextTick(() => cb(0)); }),
      exitCode: 0,
    });
  });

  describe('createBackup', () => {
    it('deve executar o pg_dump', async () => {
      await createBackup();
      expect(child_process.spawn).toHaveBeenCalledWith('pg_dump', ['-d', DATABASE_URL], expect.any(Object));
    });

    it('deve criar diretório se não existir', async () => {
      fs.existsSync.mockReturnValueOnce(false);
      await createBackup();
      expect(fs.promises.mkdir).toHaveBeenCalledWith(expect.stringContaining('backups'), { recursive: true });
    });

    it('deve limpar backups antigos', async () => {
      const fakeBackups = Array.from({ length: 12 }, (_, i) => {
        const day = (15 - i).toString().padStart(2, '0');
        return `caminhar-pg-backup_2026-01-${day}_02-00-00.sql.gz`;
      });
      fs.promises.opendir.mockResolvedValue(createAsyncDirIterator(fakeBackups));
      await createBackup();
      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    it('deve logar sucesso', async () => {
      await createBackup();
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('backup.log'), expect.stringContaining('[SUCCESS]')
      );
    });
  });

  describe('restoreBackup', () => {
    it('deve fazer backup seguro e restaurar', async () => {
      // Mock do readFile para que .sha256 retorne hash que corresponde ao digest mockado
      fs.promises.readFile.mockImplementation((path) => {
        if (String(path).endsWith('.sha256')) return Promise.resolve('abc123hash\n');
        return Promise.resolve('');
      });

      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await restoreBackup('backup-test.sql.gz');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('ATENÇÃO'));
      expect(child_process.spawn).toHaveBeenCalledTimes(2);
      expect(child_process.spawn).toHaveBeenNthCalledWith(1, 'pg_dump', ['-d', DATABASE_URL], expect.any(Object));
      expect(child_process.spawn).toHaveBeenNthCalledWith(2, 'psql', ['-d', DATABASE_URL], expect.any(Object));
      spy.mockRestore();
    });

    it('deve falhar se backup não existir', async () => {
      fs.existsSync.mockReturnValue(false);
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(restoreBackup('missing.sql.gz')).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Erro ao restaurar o backup'), expect.any(Error));
      spy.mockRestore();
    });
  });
});