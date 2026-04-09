import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/admin/backups.js';
import { createBackup } from '../../../../scripts/backup.js';
import fs from 'fs';

jest.mock('../../../../lib/auth.js', () => ({
  withAuth: (handler) => async (req, res) => handler(req, res)
}));
jest.mock('../../../../scripts/backup.js', () => ({
  createBackup: jest.fn()
}));
jest.mock('fs');

describe('API Admin - Backups (/api/admin/backups)', () => {
  const originalConsoleError = console.error;

  beforeAll(() => { console.error = () => {}; });
  afterAll(() => { console.error = originalConsoleError; });
  beforeEach(() => { jest.clearAllMocks(); });

  it('GET: deve listar backups ordenados se o diretório existir', async () => {
    fs.existsSync.mockReturnValueOnce(true);
    fs.readdirSync.mockReturnValueOnce(['backup1.sql.gz', 'backup2.sql']);
    fs.statSync.mockImplementation((file) => ({
      mtime: file.includes('backup1') ? new Date('2026-04-05') : new Date('2026-04-06'),
      size: 1024
    }));

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.backups).toHaveLength(2);
    expect(data.latest.name).toBe('backup2.sql');
  });

  it('GET: deve retornar array vazio em latest se arquivos não existirem', async () => {
    fs.existsSync.mockReturnValueOnce(true);
    fs.readdirSync.mockReturnValueOnce([]);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getJSONData().latest).toBeNull();
  });

  it('GET: deve retornar null se o diretório não existir', async () => {
    fs.existsSync.mockReturnValueOnce(false);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData().latest).toBeNull();
  });
  
  it('GET: deve capturar erros do Filesystem e retornar 500', async () => {
    fs.existsSync.mockImplementationOnce(() => { throw new Error('FS Error'); });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
  });

  it('POST: deve criar um novo backup com sucesso', async () => {
    createBackup.mockResolvedValueOnce({ file: 'backup3.sql.gz' });
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(createBackup).toHaveBeenCalled();
  });

  it('POST: deve retornar erro 500 se a rotina de backup falhar', async () => {
    createBackup.mockRejectedValueOnce(new Error('Backup Failed'));
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
  });

  it('deve retornar 405 para métodos não permitidos (PUT/DELETE)', async () => {
    const { req, res } = createMocks({ method: 'PUT' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});