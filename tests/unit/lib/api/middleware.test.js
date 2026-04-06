import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks para isolar dependências
jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../../../../lib/api/response.js', () => ({
  methodNotAllowed: jest.fn((res, method, allowed) => res.status(405).json({ error: 'Method Not Allowed' })),
  unauthorized: jest.fn((res, msg) => res.status(401).json({ error: msg })),
  tooManyRequests: jest.fn((res, msg) => res.status(429).json({ error: msg })),
  serverError: jest.fn((res, msg) => res.status(500).json({ error: msg })),
  handleError: jest.fn((res) => res.status(500).json({ error: 'Handled Error' })),
}));

import {
  composeMiddleware,
  withMethod,
  withAuth,
  withOptionalAuth,
  withRateLimit,
  withCors,
  withErrorHandler,
  withLogger,
  withTimeout,
  withBodyParser,
  withCache,
  publicApi,
  protectedApi
} from '../../../../lib/api/middleware.js';

import { getAuthToken, verifyToken } from '../../../../lib/auth.js';
import * as responses from '../../../../lib/api/response.js';

describe('API Middleware (lib/api/middleware.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockHandler = jest.fn((req, res) => res.status(200).json({ success: true }));

  describe('composeMiddleware', () => {
    it('deve executar os middlewares na ordem correta', async () => {
      const mid1 = (handler) => async (req, res) => { req.mid1 = true; return handler(req, res); };
      const mid2 = (handler) => async (req, res) => { req.mid2 = true; return handler(req, res); };
      
      const composed = composeMiddleware(mid1, mid2)(mockHandler);
      const { req, res } = createMocks();
      
      await composed(req, res);
      
      expect(req.mid1).toBe(true);
      expect(req.mid2).toBe(true);
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('withMethod', () => {
    it('deve permitir métodos válidos', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      const handler = withMethod(['GET', 'POST'])(mockHandler);
      await handler(req, res);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('deve bloquear métodos não permitidos', async () => {
      const { req, res } = createMocks({ method: 'PUT' });
      const handler = withMethod(['GET'])(mockHandler);
      await handler(req, res);
      expect(responses.methodNotAllowed).toHaveBeenCalled();
    });
  });

  describe('withAuth', () => {
    it('deve bloquear se não houver token', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks();
      const handler = withAuth()(mockHandler);
      await handler(req, res);
      expect(responses.unauthorized).toHaveBeenCalledWith(expect.anything(), 'Token de autenticação não fornecido');
    });

    it('deve bloquear se o token for inválido', async () => {
      getAuthToken.mockReturnValue('invalid');
      verifyToken.mockReturnValue(null);
      const { req, res } = createMocks();
      const handler = withAuth()(mockHandler);
      await handler(req, res);
      expect(responses.unauthorized).toHaveBeenCalledWith(expect.anything(), 'Token inválido ou expirado');
    });

    it('deve bloquear se não tiver a role correta', async () => {
      getAuthToken.mockReturnValue('valid');
      verifyToken.mockReturnValue({ role: 'user' });
      const { req, res } = createMocks();
      const handler = withAuth({ roles: ['admin'] })(mockHandler);
      await handler(req, res);
      expect(responses.unauthorized).toHaveBeenCalledWith(expect.anything(), 'Permissão insuficiente');
    });

    it('deve permitir e injetar user no req se sucesso', async () => {
      getAuthToken.mockReturnValue('valid');
      verifyToken.mockReturnValue({ role: 'admin' });
      const { req, res } = createMocks();
      const handler = withAuth({ roles: ['admin'] })(mockHandler);
      await handler(req, res);
      expect(req.user).toEqual({ role: 'admin' });
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('withOptionalAuth', () => {
    it('deve injetar o user se o token for válido', async () => {
      getAuthToken.mockReturnValue('valid');
      verifyToken.mockReturnValue({ id: 1 });
      const { req, res } = createMocks();
      const handler = withOptionalAuth()(mockHandler);
      await handler(req, res);
      expect(req.user).toEqual({ id: 1 });
    });

    it('deve continuar normalmente se não houver token', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks();
      const handler = withOptionalAuth()(mockHandler);
      await handler(req, res);
      expect(req.user).toBeUndefined();
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('withRateLimit', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('deve bloquear após exceder o limite em memória', async () => {
      const { req, res } = createMocks({ url: '/api' });
      req.socket = { remoteAddress: '1.2.3.4' };
      const handler = withRateLimit({ maxRequests: 2, windowMs: 1000 })(mockHandler);
      
      await handler(req, res); // 1
      await handler(req, res); // 2
      await handler(req, res); // 3 - blocked
      
      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(responses.tooManyRequests).toHaveBeenCalled();
    });

    it('deve usar maxRequests como função (limite dinâmico)', async () => {
      const { req, res } = createMocks({ url: '/api2' });
      req.socket = { remoteAddress: '1.2.3.5' };
      req.user = { vip: true }; 
      
      const maxReqsFn = (req) => req.user?.vip ? 5 : 1;
      const handler = withRateLimit({ maxRequests: maxReqsFn, windowMs: 1000 })(mockHandler);
      
      await handler(req, res); // 1
      await handler(req, res); // 2
      expect(mockHandler).toHaveBeenCalledTimes(2); // VIP tem limite 5
    });
    
    it('deve limpar registros antigos após o tempo estipulado', async () => {
      const { req, res } = createMocks({ url: '/api3' });
      req.socket = { remoteAddress: '1.2.3.6' };
      const handler = withRateLimit({ maxRequests: 1, windowMs: 1000 })(mockHandler);
      
      await handler(req, res); // 1
      await handler(req, res); // 2 - Bloqueado
      expect(responses.tooManyRequests).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(1100); // Avança o tempo
      
      await handler(req, res); // 3 - Passou novamente
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('withCors', () => {
    it('deve definir os headers corretamente para origin *', async () => {
      const { req, res } = createMocks({ headers: { origin: 'http://test.com' } });
      const handler = withCors()(mockHandler);
      await handler(req, res);
      
      expect(res.getHeader('Access-Control-Allow-Origin')).toBe('http://test.com');
      expect(res.getHeader('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('deve responder preflight OPTIONS imediatamente sem chamar o handler', async () => {
      const { req, res } = createMocks({ method: 'OPTIONS', headers: { origin: 'http://test.com' } });
      const handler = withCors()(mockHandler);
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('withErrorHandler', () => {
    it('deve capturar erros lançados pelo handler e retornar padronizado', async () => {
      const errorMockHandler = jest.fn(() => { throw new Error('Crashed'); });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { req, res } = createMocks();
      const handler = withErrorHandler()(errorMockHandler);
      await handler(req, res);
      
      expect(responses.handleError).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('deve retornar 500 se o handler demorar demais', async () => {
      const slowHandler = jest.fn(async () => new Promise(() => {})); // Nunca resolve
      const handler = withTimeout(100)(slowHandler);
      const { req, res } = createMocks();
      
      handler(req, res);
      jest.advanceTimersByTime(200); 
      
      expect(responses.serverError).toHaveBeenCalledWith(expect.anything(), 'Tempo de requisição excedido');
    });
  });

  describe('withBodyParser', () => {
    it('deve bloquear payload muito grande', async () => {
      const largeBody = { data: 'a'.repeat(2048) }; // > 1kb
      const { req, res } = createMocks({ body: largeBody });
      const handler = withBodyParser({ limit: 1024 })(mockHandler);
      await handler(req, res);
      
      expect(responses.serverError).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('tamanho máximo'));
    });
  });

  describe('withCache', () => {
    it('deve adicionar Cache-Control para GET', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      const handler = withCache(120)(mockHandler);
      await handler(req, res);
      expect(res.getHeader('Cache-Control')).toBe('public, max-age=120');
    });
  });

  describe('Composições Prontas', () => {
    it('publicApi deve aceitar configuração básica', async () => {
      const handler = publicApi(mockHandler);
      const { req, res } = createMocks({ method: 'GET', url: '/public' });
      await handler(req, res);
      expect(mockHandler).toHaveBeenCalled();
    });
  });
});