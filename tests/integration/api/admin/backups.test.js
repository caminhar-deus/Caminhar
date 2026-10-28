import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/admin/backups.js';
import { createBackup, getAvailableBackups } from '../../../../scripts/backup.js';
import { suppressConsoleError } from '../../../helpers/console.js';

// Mock do DB para controlar a query de roles do RBAC (createAdminHandler)
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());
import { query } from '../../../../lib/infra/db.js';

jest.mock('../../../../lib/auth/auth.js', () => ({
  withAuth: (handler) => async (req, res) => {
    req.user = req._userOverride || { username: 'test-admin', role: 'admin' };
    return handler(req, res);
  }
}));
// A rota é um wrapper fino sobre o script de backup: a listagem (GET) usa
// getAvailableBackups, que ordena pelo timestamp gravado no NOME do arquivo
// (data de criação) — não pelo mtime, que cópias/movimentações reescrevem
// (doc privado §8, item 3). A extração vive em parseBackupTimestamp
// (tests/unit/scripts/date-format.test.js).
jest.mock('../../../../scripts/backup.js', () => ({
  createBackup: jest.fn(),
  getAvailableBackups: jest.fn(),
}));

describe('API Admin - Backups (/api/admin/backups)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
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
  afterEach(() => { consoleErrorSpy?.mockRestore(); });

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
    getAvailableBackups.mockResolvedValueOnce([]);

    const { req, res } = createMocks({ method: 'GET' });
    req._userOverride = { username: 'editor', role: 'comum' };
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData().latest).toBeNull();
  });

  it('GET: deve listar backups com a data de criação extraída do nome do arquivo', async () => {
    // Ordem já vem do script (mais recente primeiro, pelo timestamp do nome)
    getAvailableBackups.mockResolvedValueOnce([
      {
        filename: 'caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc',
        timestamp: '2026-05-22 10-18-54',
        date: new Date('2026-05-22T10:18:54.000Z'),
        size: 4472128,
        compressed: true,
      },
      {
        filename: 'caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc',
        timestamp: '2026-05-21 19-56-57',
        date: new Date('2026-05-21T19:56:57.000Z'),
        size: 4472125,
        compressed: true,
      },
    ]);

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.backups).toHaveLength(2);
    expect(data.latest.name).toBe('caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc');
    // A data exposta deve corresponder ao timestamp do nome — não ao mtime,
    // que é o que causava a divergência "nome 2026-05-22 × exibida 02/10/2026"
    expect(new Date(data.latest.date).toISOString()).toBe('2026-05-22T10:18:54.000Z');
  });

  it('GET: deve devolver latest null quando não houver backups', async () => {
    getAvailableBackups.mockResolvedValueOnce([]);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData().latest).toBeNull();
  });

  it('GET: deve capturar erros da listagem e retornar 500', async () => {
    getAvailableBackups.mockRejectedValueOnce(new Error('FS Error'));
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
