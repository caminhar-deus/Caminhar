import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock do módulo 'fs' para evitar operações reais no disco
jest.mock('fs', () => ({
  // Manter as outras funções do mock para que o import de 'backup.js' não falhe
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Mock do child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

import { getBackupLogs } from '../../../../scripts/backup.js';
import fs from 'fs';

describe('getBackupLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar um array vazio se o arquivo de log não existir', async () => {
    fs.existsSync.mockReturnValue(false);

    const logs = await getBackupLogs();

    expect(logs).toEqual([]);
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it('deve retornar um array vazio se o arquivo de log estiver vazio', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('');

    const logs = await getBackupLogs();

    expect(logs).toEqual([]);
  });

  it('deve parsear corretamente as linhas de log válidas', async () => {
    const logContent = `[2026-02-10 10:00:00] [SUCCESS] backup-1.sql.gz
[2026-02-10 11:00:00] [RESTORE_SUCCESS] Banco de dados restaurado de backup-1.sql.gz
[2026-02-10 12:00:00] [ERROR] Falha ao criar backup`;

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(logContent);

    const logs = await getBackupLogs();

    expect(logs).toHaveLength(3);
    expect(logs[0]).toEqual({
      timestamp: '2026-02-10 10:00:00',
      status: 'SUCCESS',
      message: 'backup-1.sql.gz',
    });
    expect(logs[2].status).toBe('ERROR');
  });

  it('deve ignorar linhas mal formatadas ou vazias', async () => {
    const logContent = `[2026-02-10 10:00:00] [SUCCESS] backup-1.sql.gz

linha mal formatada
[2026-02-10 12:00:00] [ERROR] Falha ao criar backup`;

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(logContent);

    const logs = await getBackupLogs();

    expect(logs).toHaveLength(2);
    expect(logs[0].status).toBe('SUCCESS');
    expect(logs[1].status).toBe('ERROR');
  });
});