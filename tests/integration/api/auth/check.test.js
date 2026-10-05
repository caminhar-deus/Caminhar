import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/auth/check.js';
import * as auth from '../../../../lib/auth/auth.js';
import { query } from '../../../../lib/infra/db.js';
import { logger } from '../../../../lib/infra/logger.js';

jest.mock('../../../../lib/auth/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn()
}));

jest.mock('../../../../lib/infra/db.js', () => ({
  query: jest.fn(),
}));

describe('API Auth Check (/api/auth/check)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('deve retornar 405 para métodos diferentes de GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 401 se não houver token', async () => {
    auth.getAuthToken.mockReturnValue(null);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
    const data = res._getJSONData();
    expect(data.error).toBe('Unauthorized');
  });

  it('deve retornar 401 se o token for inválido ou expirado', async () => {
    auth.getAuthToken.mockReturnValue('invalid-token');
    auth.verifyToken.mockReturnValue(null);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
    const data = res._getJSONData();
    expect(data.error).toBe('Unauthorized');
  });

  it('deve retornar 200 com dados do usuário para token válido', async () => {
    const mockUser = { userId: 1, username: 'admin', role: 'admin' };
    auth.getAuthToken.mockReturnValue('valid-token');
    auth.verifyToken.mockReturnValue(mockUser);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.success).toBe(true);
    expect(data.data.authenticated).toBe(true);
    expect(data.data.user.userId).toBe(1);
    expect(data.data.user.username).toBe('admin');
    expect(data.data.user.role).toBe('admin');
  });

  it('deve devolver user.permissions como array normalizado a partir da string TEXT do banco', async () => {
    auth.getAuthToken.mockReturnValue('valid-token');
    auth.verifyToken.mockReturnValue({ userId: 2, username: 'user', role: 'comum' });
    // O banco devolve a coluna TEXT como STRING JSON, não como array
    query.mockResolvedValueOnce({ rows: [{ permissions: '["Segurança","Usuários"]' }] });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.success).toBe(true);
    expect(data.data.user.permissions).toEqual(['Segurança', 'Usuários']);
    expect(Array.isArray(data.data.user.permissions)).toBe(true);
    // Corpo completo do usuário: consulta OK → permissionsLoaded true
    expect(data.data.user).toEqual({
      userId: 2,
      username: 'user',
      role: 'comum',
      permissions: ['Segurança', 'Usuários'],
      permissionsLoaded: true,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT permissions FROM roles'),
      ['comum'],
      { log: false },
    );

    // Mesma fronteira, dado CORROMPIDO: parse falha → fail-closed para []
    // + telemetria (logger.warn). Sem isto, corrupção viraria "sem permissão"
    // em silêncio total. O caso legítimo `'[]'` nunca alerta (ver unit test).
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    query.mockResolvedValueOnce({ rows: [{ permissions: '{"corrompido":' }] });

    const corrupted = createMocks({ method: 'GET' });
    await handler(corrupted.req, corrupted.res);

    expect(corrupted.res._getStatusCode()).toBe(200);
    expect(corrupted.res._getJSONData().data.user.permissions).toEqual([]);
    // Corrupção NÃO é falha de consulta: a query respondeu → permissionsLoaded segue true
    expect(corrupted.res._getJSONData().data.user.permissionsLoaded).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][1]).toContain('corrompidos no cargo "comum"');
    warnSpy.mockRestore();
  });

  it('deve continuar respondendo 200 com permissions: [] quando a consulta a roles falhar', async () => {
    auth.getAuthToken.mockReturnValue('valid-token');
    auth.verifyToken.mockReturnValue({ userId: 2, username: 'user', role: 'comum' });
    query.mockRejectedValueOnce(new Error('relation "roles" does not exist'));

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.success).toBe(true);
    expect(data.data.authenticated).toBe(true);
    expect(data.data.user.permissions).toEqual([]);
    expect(Array.isArray(data.data.user.permissions)).toBe(true);
    // Falha na consulta a roles → 200 degradado, mas permissionsLoaded false
    expect(data.data.user.permissionsLoaded).toBe(false);
    expect(data.data.user).toEqual({
      userId: 2,
      username: 'user',
      role: 'comum',
      permissions: [],
      permissionsLoaded: false,
    });
  });

  it('deve retornar 500 se houver erro interno', async () => {
    auth.getAuthToken.mockImplementation(() => { throw new Error('Erro interno'); });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(500);
    const data = res._getJSONData();
    expect(data.error).toBe('Internal Server Error');
  });
});