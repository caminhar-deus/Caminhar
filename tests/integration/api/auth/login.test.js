import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/auth/login';
import { authenticate, generateToken, setAuthCookie } from '../../../../lib/auth';
import { checkRateLimit } from '../../../../lib/cache';
import { query } from '../../../../lib/db';

jest.mock('../../../../lib/auth', () => ({
  authenticate: jest.fn(),
  generateToken: jest.fn(),
  setAuthCookie: jest.fn()
}));

jest.mock('../../../../lib/cache', () => ({
  checkRateLimit: jest.fn()
}));

jest.mock('../../../../lib/db', () => ({
  query: jest.fn()
}));

describe('Integração: API de Login (/api/auth/login)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Silencia os alertas de console durante os testes para manter a saída limpa
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve retornar 405 para métodos não permitidos (ex: GET)', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 429 se o IP estourar o limite de tentativas (Rate Limit)', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'a', password: 'b' } });
    checkRateLimit.mockResolvedValueOnce(true); // Simula o bloqueio
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
  });

  it('deve retornar 401 para credenciais inválidas', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'errado', password: '123' } });
    checkRateLimit.mockResolvedValueOnce(false);
    authenticate.mockResolvedValueOnce(null); // Retorna nulo, indicando falha na senha
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('deve retornar 200, definir os cookies e autorizar credenciais válidas', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'admin', password: '123' } });
    checkRateLimit.mockResolvedValueOnce(false);
    authenticate.mockResolvedValueOnce({ id: 1, username: 'admin', role: 'admin' });
    query.mockResolvedValueOnce({ rows: [] }); // Simula o update de last_login
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Visão Geral'] }] }); // Simula a busca de permissões
    generateToken.mockReturnValueOnce('fake-jwt-token');

    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(setAuthCookie).toHaveBeenCalledWith(res, 'fake-jwt-token');
    const data = JSON.parse(res._getData());
    expect(data.user.username).toBe('admin');
  });
});