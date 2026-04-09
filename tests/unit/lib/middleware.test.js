import { describe, it, expect, jest, beforeEach, beforeAll, afterAll, afterEach } from '@jest/globals';
import Cors from 'cors';
import { 
  logger, 
  apiMiddleware, 
  authenticatedApiMiddleware, 
  externalAuthMiddleware, 
  rateLimitMiddleware, 
  errorHandlingMiddleware 
} from '../../../lib/middleware.js';
import * as auth from '../../../lib/auth.js';

// Controle de estado para o mock do CORS. Utilizamos var e o prefixo "mock"
// para que o compilador consiga aplicar o Hoisting antes do jest.mock.
var mockCorsConfig = { error: false };

// Mock das dependências
jest.mock('cors', () => {
  return jest.fn(() => {
    return (req, res, next) => {
      if (mockCorsConfig.error) return next(new Error('CORS Error'));
      return next();
    };
  });
});

jest.mock('../../../lib/auth.js', () => ({
  withAuth: jest.fn((handler) => handler),
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

describe('Library - Middleware', () => {
  let req;
  let res;
  
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCorsConfig.error = false;
    req = {
      method: 'GET',
      headers: {},
      url: '/api/test',
      connection: { remoteAddress: '127.0.0.1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn()
    };
  });

  describe('logger', () => {
    it('info logs correctly', () => {
      logger.info('test info', { foo: 'bar' });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[INFO] test info'), expect.objectContaining({ foo: 'bar' }));
    });
    it('error logs correctly', () => {
      logger.error('test error', { foo: 'bar' });
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR] test error'), expect.objectContaining({ foo: 'bar' }));
    });
    it('warn logs correctly', () => {
      logger.warn('test warn', { foo: 'bar' });
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[WARN] test warn'), expect.objectContaining({ foo: 'bar' }));
    });
  });

  describe('apiMiddleware', () => {
    it('returns 500 if handler is not a function', async () => {
      const middleware = apiMiddleware(null);
      await middleware(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid handler function' }));
    });

    it('handles OPTIONS request (CORS preflight)', async () => {
      req.method = 'OPTIONS';
      const handler = jest.fn();
      const middleware = apiMiddleware(handler);
      await middleware(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    it('sets headers and calls handler for normal request', async () => {
      const handler = jest.fn().mockResolvedValue('ok');
      const middleware = apiMiddleware(handler);
      const result = await middleware(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', '1.0');
      expect(handler).toHaveBeenCalledWith(req, res);
      expect(result).toBe('ok');
    });

    it('handles errors during execution', async () => {
      const handler = jest.fn().mockImplementation(() => { throw new Error('Handler Error'); });
      const middleware = apiMiddleware(handler);
      await middleware(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'An unexpected error occurred' }));
    });
    
    it('handles CORS callback errors', async () => {
      mockCorsConfig.error = true;
      const middleware = apiMiddleware(jest.fn());
      await middleware(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('authenticatedApiMiddleware', () => {
    it('wraps handler with withAuth and apiMiddleware', () => {
      const handler = jest.fn();
      const middleware = authenticatedApiMiddleware(handler);
      expect(auth.withAuth).toHaveBeenCalledWith(handler);
      expect(typeof middleware).toBe('function');
    });
  });

  describe('externalAuthMiddleware', () => {
    it('returns 401 if no token is found', async () => {
      auth.getAuthToken.mockReturnValue(null);
      const middleware = externalAuthMiddleware(jest.fn());
      await middleware(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required' }));
    });

    it('returns 401 if token is invalid', async () => {
      auth.getAuthToken.mockReturnValue('invalid-token');
      auth.verifyToken.mockReturnValue(null);
      const middleware = externalAuthMiddleware(jest.fn());
      await middleware(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid or expired token' }));
    });

    it('calls handler and attaches user if token is valid', async () => {
      auth.getAuthToken.mockReturnValue('valid-token');
      auth.verifyToken.mockReturnValue({ id: 1, name: 'Test' });
      const handler = jest.fn().mockResolvedValue('ok');
      const middleware = externalAuthMiddleware(handler);
      const result = await middleware(req, res);
      
      expect(req.user).toEqual({ id: 1, name: 'Test' });
      expect(handler).toHaveBeenCalledWith(req, res);
      expect(result).toBe('ok');
    });
  });

  describe('rateLimitMiddleware', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('blocks requests over the limit and cleans up old entries', async () => {
      const handler = jest.fn();
      const middleware = rateLimitMiddleware(handler);
      req.headers['x-forwarded-for'] = '10.0.0.1'; // Valida também o header x-forwarded
      
      // Faz 100 requisições (Limite)
      for (let i = 0; i < 100; i++) {
        await middleware(req, res);
      }
      expect(handler).toHaveBeenCalledTimes(100);
      
      // A 101ª requisição deve ser bloqueada
      await middleware(req, res);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Too Many Requests' }));
      expect(handler).toHaveBeenCalledTimes(100); // Handler não foi chamado

      // Avança o tempo em 16 minutos para expirar o bloqueio
      jest.advanceTimersByTime(16 * 60 * 1000);
      
      // A 102ª requisição deve ser liberada
      await middleware(req, res);
      expect(handler).toHaveBeenCalledTimes(101);
    });
  });

  describe('errorHandlingMiddleware', () => {
    it('returns 500 if handler is not a function', async () => {
      const middleware = errorHandlingMiddleware(null);
      await middleware(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('calls handler successfully', async () => {
      const handler = jest.fn().mockResolvedValue('ok');
      const middleware = errorHandlingMiddleware(handler);
      await middleware(req, res);
      expect(handler).toHaveBeenCalledWith(req, res);
    });

    it('handles generic error', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Generic error'));
      const middleware = errorHandlingMiddleware(handler);
      await middleware(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal Server Error' }));
    });

    it('handles specific map of errors with correct statuses', async () => {
      const errorCases = [
        { name: 'ValidationError', msg: 'Input', status: 400, expectedType: 'Validation Error' },
        { name: 'UnauthorizedError', msg: 'Auth', status: 401, expectedType: 'Unauthorized' },
        { name: 'ForbiddenError', msg: 'Forb', status: 403, expectedType: 'Forbidden' },
        { name: 'NotFoundError', msg: 'Not F', status: 404, expectedType: 'Not Found' }
      ];

      for (const t of errorCases) {
        const err = new Error(t.msg);
        err.name = t.name;
        const handler = jest.fn().mockRejectedValue(err);
        const middleware = errorHandlingMiddleware(handler);
        
        await middleware(req, res);
        expect(res.status).toHaveBeenCalledWith(t.status);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: t.expectedType }));
      }
    });
    
    it('includes stack trace in development mode', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const err = new Error('Dev Error');
      const middleware = errorHandlingMiddleware(jest.fn().mockRejectedValue(err));
      await middleware(req, res);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ stack: expect.any(String) }));
      process.env.NODE_ENV = origEnv;
    });
  });
});