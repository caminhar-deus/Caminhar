import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { composeMiddleware, withMethod, withAuth, withCors } from '../../../../lib/api/middleware';
import * as authLib from '../../../../lib/auth';

jest.mock('../../../../lib/auth', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn()
}));

describe('Unidade: Engine de Middlewares (lib/api/middleware.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composeMiddleware: deve encadear múltiplos middlewares corretamente', async () => {
    const middle1 = (handler) => (req, res) => { req.passo1 = true; return handler(req, res); };
    const middle2 = (handler) => (req, res) => { req.passo2 = true; return handler(req, res); };
    const handlerFinal = (req, res) => res.status(200).json({ ok: req.passo1 && req.passo2 });
    
    const rotaComposta = composeMiddleware(middle1, middle2)(handlerFinal);
    const { req, res } = createMocks({ method: 'GET' });
    
    await rotaComposta(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).ok).toBe(true);
  });

  it('withMethod: deve bloquear métodos não permitidos (405)', async () => {
    const handler = jest.fn((req, res) => res.status(200).end());
    const rota = withMethod(['POST'])(handler);
    
    const { req, res } = createMocks({ method: 'GET' }); // Usando GET em rota só POST
    await rota(req, res);
    
    expect(res._getStatusCode()).toBe(405);
    expect(handler).not.toHaveBeenCalled();
  });

  it('withAuth: deve bloquear requisições sem token (401)', async () => {
    const handler = jest.fn((req, res) => res.status(200).end());
    const rota = withAuth()(handler);
    
    authLib.getAuthToken.mockReturnValue(null); // Nenhum token fornecido
    
    const { req, res } = createMocks({ method: 'GET' });
    await rota(req, res);
    
    expect(res._getStatusCode()).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('withCors: deve adicionar os headers corretos de origem e permissão', async () => {
    const handler = jest.fn((req, res) => res.status(200).end());
    const rota = withCors({ origins: ['*'] })(handler);
    
    const { req, res } = createMocks({ method: 'GET', headers: { origin: 'http://localhost:3000' } });
    await rota(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(res.getHeader('Access-Control-Allow-Methods')).toContain('GET');
  });
});