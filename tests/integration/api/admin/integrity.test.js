import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import path from 'path';

jest.mock('../../../../lib/infra/db.js', () => ({
  query: jest.fn(),
}));

jest.mock('fs', () => {
  const fsMethods = {
    existsSync: jest.fn(() => true),
    readdirSync: jest.fn(() => []),
    statfsSync: jest.fn(() => ({ bsize: 4096, bavail: 100, blocks: 200 })),
    statSync: jest.fn(() => ({ size: 128, mtime: new Date('2026-01-01T00:00:00.000Z') })),
  };
  return { __esModule: true, default: fsMethods };
});

// Mock de autenticação (withAuth injeta o usuário logado)
jest.mock('../../../../lib/auth/auth.js', () => {
  const mockModule = {
    getAuthToken: jest.fn(),
    verifyToken: jest.fn(),
    withAuth: jest.fn((handler) => async (req, res) => {
      const token = mockModule.getAuthToken();
      if (!token) {
        return res.status(401).json({ error: 'Não autenticado', message: 'Token ausente' });
      }
      const user = mockModule.verifyToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Token inválido', message: 'Token ausente ou inválido' });
      }
      req.user = user;
      return handler(req, res);
    }),
  };
  return mockModule;
});

import handler from '../../../../pages/api/admin/integrity.js';
import { query } from '../../../../lib/infra/db.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth/auth.js';
import fs from 'fs';

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const backupsDir = path.join(process.cwd(), 'data', 'backups');

const USER = { userId: 1, username: 'admin_user', role: 'admin' };

describe('API Admin - Integridade (/api/admin/integrity)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue(USER);

    // RBAC (tabela roles consultada pelo createAdminHandler) + banco (SELECT 1 / pg_database_size)
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Segurança'] }] };
      }
      if (sql.includes('SELECT 1')) {
        return { rows: [{ count: 1 }] };
      }
      if (sql.includes('pg_database_size')) {
        return { rows: [{ db_size: 2048, connections: 2 }] };
      }
      return { rows: [] };
    });

    // Armazenamento e backup existindo por padrão
    fs.readdirSync.mockImplementation((dir, opts) => {
      if (dir === uploadsDir && opts?.withFileTypes) {
        return [{ name: 'foto.jpg', isFile: () => true, isDirectory: () => false }];
      }
      if (dir === uploadsDir) return ['foto.jpg'];
      if (dir === backupsDir) return ['backup-2026-01-01.sql'];
      return [];
    });
  });

  it('deve retornar 401 quando não estiver autenticado', async () => {
    getAuthToken.mockReturnValue(null);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('deve retornar 200 com diagnóstico completo (banco ok, storage ok, backup ok, cache warning)', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.checks.database.status).toBe('ok');
    expect(body.checks.storage.status).toBe('ok');
    expect(body.checks.storage.details.totalFiles).toBe(1);
    expect(body.checks.backup.status).toBe('ok');
    expect(body.checks.backup.details.totalBackups).toBe(1);
    expect(body.checks.cache.status).toBe('warning');
    // cache em warning impede "healthy"
    expect(body.status).toBe('warning');
  });

  it('deve retornar diagnóstico com status degraded quando o banco falhar', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) return { rows: [{ permissions: [] }] };
      throw new Error('Banco indisponível');
    });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.checks.database.status).toBe('error');
    expect(body.status).toBe('degraded');
  });

  it('deve lidar com o diretório de uploads ausente', async () => {
    fs.existsSync.mockImplementation((p) => p.includes('backups'));

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    const body = JSON.parse(res._getData());
    expect(body.checks.storage.status).toBe('warning');
  });

  it('deve lidar com o diretório de backups ausente', async () => {
    fs.existsSync.mockImplementation((p) => p.includes('uploads'));

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    const body = JSON.parse(res._getData());
    expect(body.checks.backup.status).toBe('warning');
  });
});