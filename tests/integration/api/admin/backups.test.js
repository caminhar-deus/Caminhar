import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/admin/backups.js';
import { createBackup } from '../../../../scripts/backup.js';
import fs from 'fs';

// Mock do DB para controlar a query de roles do RBAC (createAdminHandler)
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());
import { query } from '../../../../lib/infra/db.js';

jest.mock('../../../../lib/auth/auth.js', () => ({
  withAuth: (handler) => async (req, res) => {
    req.user = req._userOverride || { username: 'test-admin', role: 'admin' };
    return handler(req, res);
  }
}));
jest.mock('../../../../scripts/backup.js', () => ({
  createBackup: jest.fn()
}));
jest.mock('fs');

describe('API Admin - Backups (/api/admin/backups)', () => {
  const originalConsoleError = console.error;

  beforeAll(() => { console.error = () => {}; });
  afterAll(() => { console.error = originalConsoleError; });
  beforeEach(() => {
    jest.clearAllMocks();

    // createAdminHandler consulta roles.permissions (RBAC) antes do handler:
    // devolve a permissão exigida pelo recurso para o caminho padrão ser de
    // PERMISSÃO CONCEDIDA (admin ignora, não-admin é autorizado).
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Segurança'] }] };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('GET: deve retornar 403 se o usuário não for admin e não tiver permissão', async () => {
    // O catch do adminCrudHandler também devolve 403 quando a query de roles
    // FALHA (fail-closed) — por isso este teste vem em par com o "allow"
    // logo abaixo: só o par prova que a negação aqui é por FALTA DE PERMISSÃO
    // e não por mock de banco no caminho errado.
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Dashboard'] }] });

    const { req, res } = createMocks({ method: 'GET' });
    req._userOverride = { username: 'editor', role: 'comum' };
    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    // `error` é igual nos dois caminhos de 403 (falta de permissão ×
    // fail-closed por falha de banco): só o `message` exigindo a permissão discrimina.
    const body = JSON.parse(res._getData());
    expect(body.error).toContain('Acesso negado');
    expect(body.message).toContain('Requer permissão');
  });

  it('GET: não deve retornar 403 se o usuário não-admin tiver a permissão exigida', async () => {
    // Companheiro do teste acima: mesmo cargo 'comum', mas COM 'Segurança'.
    // Se o mock do banco estiver errado (query falhando/undefined), o fail-closed
    // devolveria 403 aqui e o teste quebraria — é isso que o par garante.
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Segurança'] }] });
    fs.existsSync.mockReturnValueOnce(false);

    const { req, res } = createMocks({ method: 'GET' });
    req._userOverride = { username: 'editor', role: 'comum' };
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData().latest).toBeNull();
  });

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