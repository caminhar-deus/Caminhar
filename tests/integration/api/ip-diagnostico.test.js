import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Padrão de mock de auth usado nas suítes de integração (login/cache)
jest.mock('../../../lib/auth/auth.js', () => {
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

// Rate limit neutralizado: a rota é somente leitura e não tem efeito colateral
jest.mock('../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn(() => Promise.resolve(false)),
}));

import handler from '../../../pages/api/ip-diagnostico.js';
import { getAuthToken, verifyToken } from '../../../lib/auth/auth.js';

const TRUST_PROXY_ORIGINAL = process.env.TRUST_PROXY;

describe('API - Diagnóstico de Topologia (/api/ip-diagnostico)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, username: 'admin', role: 'admin' });
    delete process.env.TRUST_PROXY;
  });

  afterEach(() => {
    if (TRUST_PROXY_ORIGINAL === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = TRUST_PROXY_ORIGINAL;
  });

  it('deve retornar 401 sem token', async () => {
    getAuthToken.mockReturnValue(null);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('deve retornar 403 para usuário não-admin', async () => {
    verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'editor' });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  it('deve retornar 405 para método não permitido (GET apenas)', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { x: 1 } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('normaliza o socket IPv4-mapped sem TRUST_PROXY e não usa o header', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      socket: { remoteAddress: '::ffff:203.0.113.9' },
      headers: { 'user-agent': 'curl/8.5.0' },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.fatos.socketIP).toBe('203.0.113.9');
    expect(data.fatos.socketIPRaw).toBe('::ffff:203.0.113.9');
    expect(data.fatos.clientIPResolvido).toBe('203.0.113.9');
    expect(data.fatos.identityFromHeader).toBe(false);
    expect(data.fatos.hopsConfigured).toBe(0);
    expect(data.fatos.userAgent).toBe('curl/8.5.0');
  });

  it('marca o header como não confiável com cadeia de 2 entradas e hops=0', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      socket: { remoteAddress: '::ffff:203.0.113.9' },
      headers: { 'x-forwarded-for': '1.2.3.4, 9.9.9.9' },
    });
    await handler(req, res);

    const data = JSON.parse(res._getData());
    expect(data.fatos.forwardedChain).toEqual(['1.2.3.4', '9.9.9.9']);
    expect(data.fatos.chainLength).toBe(2);
    expect(data.sinais.headerNaoConfiavelIgnorado.ok).toBe(false);
    expect(data.fatos.clientIPResolvido).toBe('203.0.113.9');
    expect(data.fatos.identityFromHeader).toBe(false);
  });

  it('usa a entrada da direita com TRUST_PROXY=1', async () => {
    process.env.TRUST_PROXY = '1';
    const { req, res } = createMocks({
      method: 'GET',
      socket: { remoteAddress: '10.0.0.5' },
      headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.9' },
    });
    await handler(req, res);

    const data = JSON.parse(res._getData());
    expect(data.fatos.hopsConfigured).toBe(1);
    expect(data.fatos.identityFromHeader).toBe(true);
    expect(data.fatos.clientIPResolvido).toBe('203.0.113.9');
    expect(data.sinais.cadeiaConsistente.ok).toBe(true);
    expect(data.sinais.headerNaoConfiavelIgnorado.ok).toBe(true);
  });

  it('não sugere TRUST_PROXY igual ao comprimento da cadeia', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      socket: { remoteAddress: '::ffff:203.0.113.9' },
      headers: { 'x-forwarded-for': '1.2.3.4, 9.9.9.9' },
    });
    await handler(req, res);

    const data = JSON.parse(res._getData());
    const { orientacao, fatos } = data;

    // O comprimento da cadeia é controlável pelo cliente: a orientação precisa
    // dizer isso explicitamente e nunca derivar hops dele.
    expect(fatos.chainLength).toBe(2);
    expect(orientacao).toMatch(/não é dedutível de uma requisição/);
    expect(orientacao).toMatch(/não serve para calibrar TRUST_PROXY/);
    expect(orientacao).not.toMatch(/TRUST_PROXY\s*(?:=|:|está em)\s*2\b/);
    expect(JSON.stringify(data)).not.toMatch(/sugerido|sugestaoDeHops|hopsSugerido|trustProxySugerido/i);
  });
});
