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

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}));

import handler from '../../../../pages/api/admin/integrity.js';
import { query } from '../../../../lib/infra/db.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth/auth.js';
import { Redis } from '@upstash/redis';
import fs from 'fs';

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const backupsDir = path.join(process.cwd(), 'data', 'backups');

const USER = { userId: 1, username: 'admin_user', role: 'admin' };

describe('API Admin - Integridade (/api/admin/integrity)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue(USER);
    fs.existsSync.mockImplementation(() => true);
    fs.statfsSync.mockImplementation(() => ({ bsize: 4096, bavail: 100, blocks: 200 }));
    fs.statSync.mockImplementation(() => ({ size: 128, mtime: new Date('2026-01-01T00:00:00.000Z') }));

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

  it('deve retornar 403 se o usuário não for admin e não tiver permissão', async () => {
    // O catch do adminCrudHandler também devolve 403 quando a query de roles
    // FALHA (fail-closed) — por isso este teste vem em par com o "allow"
    // logo abaixo: só o par prova que a negação aqui é por FALTA DE PERMISSÃO
    // e não por mock de banco no caminho errado.
    verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Dashboard'] }] });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    const body = JSON.parse(res._getData());
    expect(body.error).toContain('Acesso negado');
    expect(body.message).toContain('Requer permissão');
  });

  it('não deve retornar 403 se o usuário não-admin tiver a permissão exigida', async () => {
    // Companheiro do teste acima: mesmo cargo 'comum', mas COM 'Segurança'.
    // Se o mock do banco estiver errado (query falhando/undefined), o fail-closed
    // devolveria 403 aqui e o teste quebraria — é isso que o par garante.
    verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Segurança'] }] });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.checks.database.status).toBe('ok');
    expect(body.checks.storage.status).toBe('ok');
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

  it('deve testar Redis saudável (status geral healthy), Redis degradado e erro ao conectar Redis', async () => {
    const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
    const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    try {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token';

      // 1. Redis PONG -> healthy
      Redis.mockImplementation(() => ({ ping: jest.fn().mockResolvedValue('PONG') }));
      const { req: reqOk, res: resOk } = createMocks({ method: 'GET' });
      await handler(reqOk, resOk);
      const bodyOk = JSON.parse(resOk._getData());
      expect(bodyOk.checks.cache.status).toBe('ok');
      expect(bodyOk.checks.cache.details.connected).toBe(true);
      expect(bodyOk.status).toBe('healthy');

      // 2. Redis retorna algo diferente de PONG -> degraded
      Redis.mockImplementation(() => ({ ping: jest.fn().mockResolvedValue('ERR') }));
      const { req: reqBadPing, res: resBadPing } = createMocks({ method: 'GET' });
      await handler(reqBadPing, resBadPing);
      const bodyBadPing = JSON.parse(resBadPing._getData());
      expect(bodyBadPing.checks.cache.status).toBe('degraded');
      expect(bodyBadPing.checks.cache.details.connected).toBe(false);

      // 3. Redis lança exceção -> degraded
      Redis.mockImplementation(() => ({ ping: jest.fn().mockRejectedValue(new Error('Redis timeout')) }));
      const { req: reqThrow, res: resThrow } = createMocks({ method: 'GET' });
      await handler(reqThrow, resThrow);
      const bodyThrow = JSON.parse(resThrow._getData());
      expect(bodyThrow.checks.cache.status).toBe('degraded');
      expect(bodyThrow.checks.cache.details.error).toBe('Redis timeout');
    } finally {
      if (prevUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
      if (prevToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    }
  });

  it('deve cobrir subdiretórios recursivos em uploads, db_size nulo, pasta de backups vazia, erros de fs e formatação de uptime/age', async () => {
    const subDir = path.join(uploadsDir, 'sub');
    const uptimeSpy = jest.spyOn(process, 'uptime').mockReturnValue(90065); // 1d 1h 1m

    try {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) {
          return { rows: [{ permissions: ['Segurança'] }] };
        }
        if (sql.includes('SELECT 1')) {
          return { rows: [{ count: 1 }] };
        }
        if (sql.includes('pg_database_size')) {
          return { rows: [{ db_size: null, connections: null }] };
        }
        return { rows: [] };
      });

      // Subdiretório em uploads + backup recente (<1h)
      fs.readdirSync.mockImplementation((dir, opts) => {
        if (dir === uploadsDir && opts?.withFileTypes) {
          return [{ name: 'sub', isFile: () => false, isDirectory: () => true }];
        }
        if (dir === subDir && opts?.withFileTypes) {
          return [{ name: 'inner.png', isFile: () => true, isDirectory: () => false }];
        }
        if (dir === uploadsDir) return ['sub'];
        if (dir === backupsDir) return [];
        return [];
      });

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      const body = JSON.parse(res._getData());
      expect(body.checks.database.details.size).toBe('Desconhecido');
      expect(body.checks.storage.status).toBe('ok');
      expect(body.checks.backup.status).toBe('warning');
      expect(body.checks.backup.details.lastBackup).toBeNull();
      expect(body.checks.system.details.uptime).toBe('1d 1h 1m');

      // Erro em statfsSync + erro em readdirSync de backups + backup de horas atrás
      fs.statfsSync.mockImplementationOnce(() => {
        throw new Error('Disk stat error');
      });
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === backupsDir) throw new Error('Backups unreadable');
        return [];
      });

      const { req: reqErr, res: resErr } = createMocks({ method: 'GET' });
      await handler(reqErr, resErr);
      const bodyErr = JSON.parse(resErr._getData());
      expect(bodyErr.checks.storage.status).toBe('warning');
      expect(bodyErr.checks.storage.details.error).toBe('Disk stat error');
      expect(bodyErr.checks.backup.status).toBe('warning');
      expect(bodyErr.checks.backup.details.error).toBe('Backups unreadable');

      // Backup com <1h e outro com <24h (integrity.js chama statSync duas vezes por arquivo)
      const now = Date.now();
      fs.statSync.mockImplementation(() => ({ size: 0, mtime: new Date(now - 5 * 60 * 1000) }));
      fs.readdirSync.mockImplementation((dir) => (dir === backupsDir ? ['recente.sql'] : []));
      const { req: reqRecent, res: resRecent } = createMocks({ method: 'GET' });
      await handler(reqRecent, resRecent);
      expect(JSON.parse(resRecent._getData()).checks.backup.details.lastBackup.age).toBe('Menos de 1 hora atrás');

      fs.statSync.mockImplementation(() => ({ size: 512, mtime: new Date(now - 3 * 3600 * 1000) }));
      const { req: reqHours, res: resHours } = createMocks({ method: 'GET' });
      await handler(reqHours, resHours);
      expect(JSON.parse(resHours._getData()).checks.backup.details.lastBackup.age).toBe('3 hora(s) atrás');
    } finally {
      uptimeSpy.mockRestore();
    }
  });
});