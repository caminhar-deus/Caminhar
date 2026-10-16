/**
 * X-Request-Id nas respostas admin (`createAdminHandler`).
 *
 * Três invariantes:
 * 1. Toda resposta admin carrega o header `X-Request-Id` — inclusive nos
 *    early-returns (401 do `withAuth`, 403 do RBAC) e no 500 do catch final;
 * 2. Um `x-request-id` VÁLIDO enviado pelo cliente é ecoado de volta
 *    (correlação cliente↔log);
 * 3. Um `x-request-id` INVÁLIDO (caractere fora do conjunto seguro, ou longo
 *    demais) NUNCA é ecoado: o servidor ignora e gera um UUID — o valor é
 *    entrada não confiável e é copiado para o header e para o log.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/admin/stats.js';
import * as auth from '../../../../../lib/auth/auth.js';
import * as db from '../../../../../lib/infra/db.js';

jest.mock('../../../../../lib/auth/auth.js', () => {
  const mockModule = {
    getAuthToken: jest.fn(),
    verifyToken: jest.fn(),
    // Espelha o comportamento do withAuth real: 401 ANTES de chamar o handler.
    withAuth: jest.fn((handlerFn) => async (req, res) => {
      const token = mockModule.getAuthToken(req);
      if (!token) {
        return res.status(401).json({ message: 'Não autenticado' });
      }
      const user = mockModule.verifyToken(token);
      if (!user) {
        return res.status(401).json({ message: 'Token inválido' });
      }
      req.user = user;
      return handlerFn(req, res);
    }),
  };
  return mockModule;
});

jest.mock('../../../../../lib/infra/db.js', () => require('../../../../mocks/db-module').mockDb());

/** Formato do UUIDv4 gerado por `randomUUID()` do node:crypto. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Header malicioso: `<`, `>` e `/` estão fora do conjunto permitido. */
const MALICIOUS_HEADER = 'abc<script>alert(1)</script>';

/** Header longo demais: 200 caracteres (> limite de 128). */
const OVERSIZED_HEADER = 'a'.repeat(200);

describe('API - Admin - X-Request-Id (sanitização e propagação)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    auth.getAuthToken.mockReturnValue('valid_token');
    auth.verifyToken.mockReturnValue({ role: 'admin' });
    db.query.mockReset();
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('500 devolve X-Request-Id com UUID gerado pelo servidor', async () => {
    db.query.mockReset();
    db.query.mockRejectedValue(new Error('Erro Forçado no DB'));

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const id = res.getHeader('X-Request-Id');
    expect(typeof id).toBe('string');
    expect(id).toMatch(UUID_RE);
  });

  it('403 do RBAC também devolve X-Request-Id', async () => {
    // Cargo sem permissão → fail-closed → 403 antes do handler executar
    auth.verifyToken.mockReturnValue({ role: 'user' });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    const id = res.getHeader('X-Request-Id');
    expect(typeof id).toBe('string');
    expect(id).toMatch(UUID_RE);
  });

  it('401 do withAuth (sem token) também devolve X-Request-Id', async () => {
    auth.getAuthToken.mockReturnValue(null);

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const id = res.getHeader('X-Request-Id');
    expect(typeof id).toBe('string');
    expect(id).toMatch(UUID_RE);
  });

  it('ecoa de volta um x-request-id válido enviado pelo cliente', async () => {
    auth.verifyToken.mockReturnValue({ role: 'user' });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'x-request-id': 'trace-abc.123_XYZ-9' },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    expect(res.getHeader('X-Request-Id')).toBe('trace-abc.123_XYZ-9');
  });

  it('SEGURANÇA: x-request-id com caractere não permitido NÃO é ecoado', async () => {
    auth.verifyToken.mockReturnValue({ role: 'user' });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'x-request-id': MALICIOUS_HEADER },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    const id = res.getHeader('X-Request-Id');
    expect(id).not.toBe(MALICIOUS_HEADER);
    expect(id).not.toContain('<');
    expect(id).toMatch(UUID_RE);
  });

  it('SEGURANÇA: x-request-id com 200 caracteres NÃO é ecoado', async () => {
    auth.verifyToken.mockReturnValue({ role: 'user' });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'x-request-id': OVERSIZED_HEADER },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    const id = res.getHeader('X-Request-Id');
    expect(id).not.toBe(OVERSIZED_HEADER);
    expect(id).toMatch(UUID_RE);
  });

  it('injeta o requestId no JSON de log em produção (NODE_ENV=production)', async () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      db.query.mockReset();
      db.query.mockRejectedValue(new Error('Erro Forçado no DB'));

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const id = res.getHeader('X-Request-Id');
      // Sem o envolve, o header não existe → `id` seria undefined e a
      // comparação abaixo passaria "por acaso"; o UUID torna o teste discriminante.
      expect(id).toMatch(UUID_RE);

      // O catch final loga via logger.error → em produção sai JSON no console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
      const line = consoleErrorSpy.mock.calls.at(-1)[0];
      expect(typeof line).toBe('string');
      const parsed = JSON.parse(line);
      expect(parsed.level).toBe('error');
      expect(parsed.module).toBe('AdminCrudHandler');
      expect(parsed.requestId).toBe(id);
    } finally {
      process.env.NODE_ENV = previousEnv;
    }
  });
});
