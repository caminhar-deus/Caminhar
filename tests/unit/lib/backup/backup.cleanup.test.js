import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo 'fs' para evitar operações reais no disco
jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  mkdirSync: jest.fn(),
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

// Mock do child_process (importado pelo backup.js, embora não usado nesta função específica)
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

import { cleanupOldBackups } from '../../../../scripts/backup.js';
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

describe('cleanupOldBackups (Rotação de Backups)', () => {
  const BACKUP_PREFIX = 'caminhar-pg-backup';

  beforeEach(() => {
    // Configuração padrão dos mocks para evitar erros de log
    fs.readFileSync.mockReturnValue('');
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 1024 });
    // Mocks padrão para funções assíncronas
    fs.promises.access.mockResolvedValue();
    fs.promises.appendFile.mockResolvedValue();
    fs.promises.unlink.mockResolvedValue();
    fs.promises.mkdir.mockResolvedValue();
    fs.promises.readFile.mockResolvedValue('');
  });

  it('deve remover backups antigos excedendo o limite de 10', async () => {
    // Gera 12 nomes de arquivos com datas sequenciais
    const files = [];
    for (let i = 1; i <= 12; i++) {
      // Dias 01 a 12. O dia 12 é o mais recente (2026-01-12).
      const day = i.toString().padStart(2, '0');
      files.push(`${BACKUP_PREFIX}_2026-01-${day}_12-00-00.sql.gz`);
    }

    // Mock do opendir para retornar a lista de arquivos simulada
    fs.promises.opendir.mockResolvedValue(createAsyncDirIterator(files));

    await cleanupOldBackups();

    // A lógica deve ordenar por data (mais recente primeiro) e manter os top 10.
    // Arquivos mantidos: dias 12, 11, 10, 09, 08, 07, 06, 05, 04, 03.
    // Arquivos a remover: dias 02 e 01 (os mais antigos).
    // cleanupOldBackups usa fs.promises.unlink (assíncrono)
    
    // cleanupOldBackups chama getBackupFiles(maxBackups + 1) = 11
    // Retorna 11 arquivos (dos 12 mockados). files.slice(10) = 1 arquivo excedente.
    // Para esse 1 arquivo: tenta remover .sql.gz, .enc e .sha256 = 3 chamadas de unlink
    expect(fs.promises.unlink).toHaveBeenCalledTimes(3);
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('não deve remover nada se houver 10 ou menos backups', async () => {
    const files = [];
    for (let i = 1; i <= 10; i++) {
      const day = i.toString().padStart(2, '0');
      files.push(`${BACKUP_PREFIX}_2026-01-${day}_12-00-00.sql.gz`);
    }

    fs.promises.opendir.mockResolvedValue(createAsyncDirIterator(files));

    await cleanupOldBackups();

    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('deve ignorar arquivos que não correspondem ao padrão de nome de backup', async () => {
    const files = [
      `${BACKUP_PREFIX}_2026-01-01_12-00-00.sql.gz`, // Válido
      'arquivo-aleatorio.txt', // Inválido
      'outro-backup.sql', // Inválido
    ];

    fs.promises.opendir.mockResolvedValue(createAsyncDirIterator(files));

    await cleanupOldBackups();

    // Apenas 1 arquivo válido encontrado, limite não excedido -> nenhuma remoção
    expect(fs.promises.unlink).not.toHaveBeenCalled();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});