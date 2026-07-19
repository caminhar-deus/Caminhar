import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo 'fs' para evitar operações reais no disco
jest.mock('fs', () => ({
  // Mantém funções síncronas necessárias para outros módulos não falharem
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

// Mock do child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

import { getBackupLogs } from '../../../../scripts/backup.js';
import fs from 'fs';

describe('getBackupLogs', () => {
  beforeEach(() => {
  });

  it('deve retornar um array vazio se o arquivo de log não existir', async () => {
    fs.promises.access.mockRejectedValue(new Error('ENOENT'));

    const logs = await getBackupLogs();

    expect(logs).toEqual([]);
    expect(fs.promises.readFile).not.toHaveBeenCalled();
  });

  it('deve retornar um array vazio se o arquivo de log estiver vazio', async () => {
    fs.promises.access.mockResolvedValue();
    fs.promises.readFile.mockResolvedValue('');

    const logs = await getBackupLogs();

    expect(logs).toEqual([]);
  });

  it('deve parsear corretamente as linhas de log válidas', async () => {
    const logContent = `[2026-02-10 10:00:00] [SUCCESS] backup-1.sql.gz
[2026-02-10 11:00:00] [RESTORE_SUCCESS] Banco de dados restaurado de backup-1.sql.gz
[2026-02-10 12:00:00] [ERROR] Falha ao criar backup`;

    fs.promises.access.mockResolvedValue();
    fs.promises.readFile.mockResolvedValue(logContent);

    const logs = await getBackupLogs();

    expect(logs).toHaveLength(3);
    expect(logs[0]).toEqual({
      timestamp: '2026-02-10 12:00:00',
      status: 'ERROR',
      message: 'Falha ao criar backup',
    });
    expect(logs[2].status).toBe('SUCCESS');
  });

  it('deve ignorar linhas mal formatadas ou vazias', async () => {
    const logContent = `[2026-02-10 10:00:00] [SUCCESS] backup-1.sql.gz

linha mal formatada
[2026-02-10 12:00:00] [ERROR] Falha ao criar backup`;

    fs.promises.access.mockResolvedValue();
    fs.promises.readFile.mockResolvedValue(logContent);

    const logs = await getBackupLogs();

    expect(logs).toHaveLength(2);
    expect(logs[0].status).toBe('ERROR');
    expect(logs[1].status).toBe('SUCCESS');
  });
});