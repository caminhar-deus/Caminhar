import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock completo do 'fs' para isolar o teste
jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
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

// Mock do 'child_process' pois é uma dependência de 'backup.js'
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

import { getAvailableBackups } from '../../../../scripts/backup.js';
import fs from 'fs';

// Helper para criar um iterador assíncrono a partir de uma lista de nomes
function createAsyncDirIterator(files) {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next() {
          if (i < files.length) {
            return Promise.resolve({ value: { name: files[i++], isFile: () => true }, done: false });
          }
          return Promise.resolve({ value: undefined, done: true });
        }
      };
    }
  };
}

describe('getAvailableBackups', () => {
  const BACKUP_PREFIX = 'caminhar-pg-backup';

  beforeEach(() => {
    // Comportamento padrão: o diretório de backup existe
    fs.existsSync.mockReturnValue(true);
    // Mocks padrão para funções assíncronas
    fs.promises.access.mockResolvedValue();
    fs.promises.readFile.mockResolvedValue('');
    fs.promises.mkdir.mockResolvedValue();
    fs.promises.stat.mockResolvedValue({ size: 54321 });
  });

  it('deve listar, formatar e ordenar corretamente os arquivos de backup', async () => {
    // O formato de nome gerado por generateBackupFilename() usa formato ISO com 'T':
    // caminhar-pg-backup_2026-01-10T12-00-00Z.sql.gz
    const fakeFiles = [
      `${BACKUP_PREFIX}_2026-01-10T12-00-00Z.sql.gz`, // Antigo
      'arquivo-qualquer.txt',
      `${BACKUP_PREFIX}_2026-01-12T12-00-00Z.sql.gz`, // Mais novo
      `${BACKUP_PREFIX}_2026-01-11T12-00-00Z.sql.gz`, // Intermediário
    ];
    const fakeSize = 54321;

    fs.promises.opendir.mockResolvedValue(createAsyncDirIterator(fakeFiles));
    fs.statSync.mockReturnValue({ size: fakeSize });

    const backups = await getAvailableBackups();

    // Deve ter filtrado o 'arquivo-qualquer.txt'
    expect(backups).toHaveLength(3);

    // Deve estar ordenado do mais novo para o mais antigo
    expect(backups[0].filename).toContain('2026-01-12');
    expect(backups[1].filename).toContain('2026-01-11');
    expect(backups[2].filename).toContain('2026-01-10');

    // Deve ter o formato correto
    // Nota: a função getAvailableBackups remove o 'Z' final do timestamp
    expect(backups[0]).toEqual({
      filename: `${BACKUP_PREFIX}_2026-01-12T12-00-00Z.sql.gz`,
      timestamp: '2026-01-12 12-00-00',
      size: fakeSize,
      compressed: true,
    });

    // Deve ter verificado o status de cada arquivo de backup válido
    expect(fs.promises.stat).toHaveBeenCalledTimes(3);
  });

  it('deve retornar um array vazio se não houver arquivos de backup no diretório', async () => {
    fs.promises.opendir.mockResolvedValue(createAsyncDirIterator(['log.txt', 'temp.file']));
    const backups = await getAvailableBackups();
    expect(backups).toEqual([]);
  });

  it('deve criar o diretório de backup se ele não existir e retornar um array vazio', async () => {
    fs.existsSync.mockReturnValue(false); // Simula que o diretório não existe
    fs.promises.opendir.mockResolvedValue(createAsyncDirIterator([])); // O diretório recém-criado estará vazio
    const backups = await getAvailableBackups();
    expect(fs.promises.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(backups).toEqual([]);
  });
});