import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks declarados ANTES da importação do handler
jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());
jest.mock('../../../lib/auth/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import handler from '../../../pages/api/status.js';
import { query } from '../../../lib/infra/db.js';
import { getAuthToken, verifyToken } from '../../../lib/auth/auth.js';

describe('API Status (/api/status)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Padrão: token presente e válido — o diagnóstico exige autenticação.
    // Os casos que testam ausência/invalidade sobrescrevem estes mocks.
    getAuthToken.mockReturnValue('token-valido');
    verifyToken.mockReturnValue({ userId: 1, username: 'admin', role: 'admin' });
  });

  it('deve retornar 405 para métodos diferentes de GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 200 e { status: ok } no modo health sem token algum', async () => {
    getAuthToken.mockReturnValue(null);
    verifyToken.mockReturnValue(null);

    const { req, res } = createMocks({ method: 'GET', query: { mode: 'health' } });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ status: 'ok' });
  });

  it('deve retornar 200 e database conectada se a query de health funcionar', async () => {
    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.data.database.status).toBe('connected');
  });

  it('deve retornar 200 mas com erro no database se a query falhar, sem vazar a mensagem do banco', async () => {
    // Falha montada com mensagem reconhecível: se ela aparecer no corpo,
    // a regressão do vazamento (mensagem crua do driver) voltou.
    query.mockRejectedValueOnce(new Error('DB Offline'));
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.data.database.status).toBe('error');
    expect(data.data.database.details).toBeDefined();
    expect(JSON.stringify(data)).not.toContain('DB Offline');
  });

  it('deve usar development como ambiente fallback caso NODE_ENV não esteja definido', async () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getJSONData().data.api.environment).toBe('development');
    process.env.NODE_ENV = originalEnv;
  });

  it('deve retornar 401 no diagnóstico quando não há token', async () => {
    getAuthToken.mockReturnValue(null);

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({ error: 'Unauthorized', message: 'Não autenticado' });
  });

  it('deve retornar 401 no diagnóstico quando o token é inválido ou expirado', async () => {
    verifyToken.mockReturnValue(null);

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({ error: 'Unauthorized', message: 'Token inválido ou expirado' });
  });

  it('deve retornar 200 com o diagnóstico completo quando o token é válido', async () => {
    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.data.database.status).toBe('connected');
    expect(data.data.system).toBeDefined();
    expect(data.data.api).toBeDefined();
  });
});
