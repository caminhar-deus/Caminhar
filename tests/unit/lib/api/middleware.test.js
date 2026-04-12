import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
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
  publicApi,
  protectedApi,
  withCache
} from '../../../../lib/api/middleware.js';

import * as auth from '../../../../lib/auth.js';
import * as response from '../../../../lib/api/response.js';

jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn()
}));

jest.mock('../../../../lib/api/response.js', () => ({
  success: jest.fn(),
  methodNotAllowed: jest.fn(),
  unauthorized: jest.fn(),
  tooManyRequests: jest.fn(),
  serverError: jest.fn(),
  handleError: jest.fn()
}));

describe('Library - API - Middleware', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      method: 'GET',
      headers: {},
      url: '/api/test',
      socket: { remoteAddress: '127.0.0.1' }
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };
  });

  describe('composeMiddleware', () => {
    it('composes multiple middlewares correctly', async () => {
      const m1 = (h) => (req, res) => { req.m1 = true; return h(req, res); };
      const m2 = (h) => (req, res) => { req.m2 = true; return h(req, res); };
      const handler = jest.fn();
      
      const composed = composeMiddleware(m1, m2)(handler);
      await composed(req, res);
      
      expect(req.m1).toBe(true);
      expect(req.m2).toBe(true);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('withMethod', () => {
    it('allows permitted methods', async () => {
      const handler = jest.fn();
      const middleware = withMethod(['GET', 'POST'])(handler);
      req.method = 'GET';
      await middleware(req, res);
      expect(handler).toHaveBeenCalled();
    });

    it('blocks unpermitted methods', async () => {
      const handler = jest.fn();
      const middleware = withMethod(['POST'])(handler);
      req.method = 'GET';
      await middleware(req, res);
      expect(response.methodNotAllowed).toHaveBeenCalledWith(res, 'GET', ['POST']);
    });
  });

  describe('withAuth', () => {
    it('returns unauthorized if no token', async () => {
      auth.getAuthToken.mockReturnValue(null);
      const middleware = withAuth()(jest.fn());
      await middleware(req, res);
      expect(response.unauthorized).toHaveBeenCalledWith(res, 'Token de autenticação não fornecido');
    });

    it('returns unauthorized if token invalid', async () => {
      auth.getAuthToken.mockReturnValue('invalid');
      auth.verifyToken.mockReturnValue(null);
      const middleware = withAuth()(jest.fn());
      await middleware(req, res);
      expect(response.unauthorized).toHaveBeenCalledWith(res, 'Token inválido ou expirado');
    });

    it('returns unauthorized if role insufficient', async () => {
      auth.getAuthToken.mockReturnValue('valid');
      auth.verifyToken.mockReturnValue({ role: 'user' });
      const middleware = withAuth({ roles: ['admin'] })(jest.fn());
      await middleware(req, res);
      expect(response.unauthorized).toHaveBeenCalledWith(res, 'Permissão insuficiente');
    });

    it('calls handler if auth is valid', async () => {
      auth.getAuthToken.mockReturnValue('valid');
      auth.verifyToken.mockReturnValue({ role: 'admin' });
      const handler = jest.fn();
      const middleware = withAuth({ roles: ['admin'] })(handler);
      await middleware(req, res);
      expect(req.user).toEqual({ role: 'admin' });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('withOptionalAuth', () => {
    it('does not add user if no token', async () => {
      auth.getAuthToken.mockReturnValue(null);
      const handler = jest.fn();
      const middleware = withOptionalAuth()(handler);
      await middleware(req, res);
      expect(req.user).toBeUndefined();
      expect(handler).toHaveBeenCalled();
    });

    it('adds user if token is valid', async () => {
      auth.getAuthToken.mockReturnValue('valid');
      auth.verifyToken.mockReturnValue({ id: 1 });
      const handler = jest.fn();
      const middleware = withOptionalAuth()(handler);
      await middleware(req, res);
      expect(req.user).toEqual({ id: 1 });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('withRateLimit', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('blocks request when limit exceeded', async () => {
      const handler = jest.fn();
      const middleware = withRateLimit({ maxRequests: 2, windowMs: 1000 })(handler);
      
      await middleware(req, res); // 1
      await middleware(req, res); // 2
      await middleware(req, res); // 3 (bloqueado)
      
      expect(handler).toHaveBeenCalledTimes(2);
      expect(response.tooManyRequests).toHaveBeenCalled();
    });

    it('cleans up old entries based on interval', async () => {
      const middleware = withRateLimit({ maxRequests: 2, windowMs: 1000 })(jest.fn());
      await middleware(req, res); // Cria entrada
      
      // Avança o tempo além do intervalo de 5 minutos do cleanup
      jest.advanceTimersByTime(6 * 60 * 1000);
      
      await middleware(req, res); // Nova requisição permitida
      expect(response.tooManyRequests).not.toHaveBeenCalled();
    });

    it('uses custom keyGenerator and dynamic maxRequests function', async () => {
      const handler = jest.fn();
      req.user = { id: 'custom' };
      const middleware = withRateLimit({
        keyGenerator: (r) => r.user.id,
        maxRequests: (r) => r.user ? 10 : 2
      })(handler);
      
      await middleware(req, res);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('withCors', () => {
    it('sets CORS headers for allowed origin', async () => {
      const handler = jest.fn();
      const middleware = withCors({ origins: ['https://example.com'] })(handler);
      req.headers.origin = 'https://example.com';
      await middleware(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
    });

    it('handles OPTIONS request automatically', async () => {
      const handler = jest.fn();
      const middleware = withCors({ origins: ['*'] })(handler);
      req.method = 'OPTIONS';
      req.headers.origin = 'https://other.com';
      await middleware(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://other.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('withErrorHandler', () => {
    it('handles errors thrown by handler', async () => {
      const error = new Error('Test error');
      const handler = jest.fn().mockRejectedValue(error);
      const middleware = withErrorHandler({ includeStack: true })(handler);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await middleware(req, res);
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(response.handleError).toHaveBeenCalledWith(res, error, true);
      consoleSpy.mockRestore();
    });
  });

  describe('withLogger', () => {
    it('logs request initiation and completion with duration', async () => {
      const loggerFn = jest.fn();
      const handler = async (req, res) => { res.statusCode = 200; res.end(); };
      const middleware = withLogger({ logger: loggerFn })(handler);
      
      await middleware(req, res);
      expect(loggerFn).toHaveBeenCalledWith(expect.stringContaining('[GET] /api/test - Iniciando'));
      expect(loggerFn).toHaveBeenCalledWith(expect.stringContaining('200'));
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('returns timeout error if handler takes too long', async () => {
      let resolveHandler;
      const handler = () => new Promise(resolve => { resolveHandler = resolve; });
      const middleware = withTimeout(1000)(handler);
      
      const promise = middleware(req, res);
      jest.advanceTimersByTime(1500); // Dispara o timeout
      
      expect(response.serverError).toHaveBeenCalledWith(res, 'Tempo de requisição excedido');
      
      resolveHandler(); // Libera promessa pendente
      await promise;
    });

    it('clears timeout if handler succeeds quickly', async () => {
      const handler = jest.fn().mockResolvedValue('ok');
      const middleware = withTimeout(1000)(handler);
      
      await middleware(req, res);
      expect(handler).toHaveBeenCalled();
      expect(response.serverError).not.toHaveBeenCalled();
    });
    
    it('clears timeout if handler throws error', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('err'));
      const middleware = withTimeout(1000)(handler);
      
      await expect(middleware(req, res)).rejects.toThrow('err');
      expect(response.serverError).not.toHaveBeenCalled();
    });
  });

  describe('withBodyParser', () => {
    it('blocks request if body exceeds limit', async () => {
      req.body = { data: 'a'.repeat(2000) };
      const middleware = withBodyParser({ limit: 1000 })(jest.fn());
      await middleware(req, res);
      expect(response.serverError).toHaveBeenCalledWith(res, 'Corpo da requisição excede o tamanho máximo permitido');
    });

    it('allows request if body is within limits', async () => {
      req.body = { data: 'a' };
      const handler = jest.fn();
      const middleware = withBodyParser({ limit: 1000 })(handler);
      await middleware(req, res);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('withCache', () => {
    it('sets cache headers for GET requests', async () => {
      const handler = jest.fn();
      const middleware = withCache(120)(handler);
      await middleware(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=120');
      expect(handler).toHaveBeenCalled();
    });

    it('does not set cache headers for POST requests', async () => {
      req.method = 'POST';
      const handler = jest.fn();
      const middleware = withCache(120)(handler);
      await middleware(req, res);
      expect(res.setHeader).not.toHaveBeenCalledWith('Cache-Control', expect.any(String));
    });
  });

  describe('Composed Builders', () => {
    it('publicApi wraps handlers with standard middlewares', () => {
      const composed = publicApi(jest.fn());
      expect(typeof composed).toBe('function');
    });

    it('protectedApi wraps handlers with secured middlewares', () => {
      const composed = protectedApi(jest.fn(), { roles: ['admin'] });
      expect(typeof composed).toBe('function');
    });
  });
});