import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  withLogger,
  composeMiddleware,
  withCors,
  withErrorHandler,
  withRateLimit,
  withAuth,
} from '../../../lib/api/middleware.js';
import * as auth from '../../../lib/auth.js';

// Mocks de dependências
jest.mock('../../../lib/api/response.js', () => ({
  methodNotAllowed: jest.fn(),
  unauthorized: jest.fn(),
  tooManyRequests: jest.fn(),
  serverError: jest.fn(),
  handleError: jest.fn(),
}));

jest.mock('../../../lib/cache.js', () => ({
  checkRateLimit: jest.fn(),
  getCacheMetrics: jest.fn().mockReturnValue({ redisConnected: false }),
}));

jest.mock('../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import { handleError, tooManyRequests } from '../../../lib/api/response.js';
import { checkRateLimit } from '../../../lib/cache.js';

describe('Library - Middleware (api/middleware.js)', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    req = {
      method: 'GET',
      headers: {},
      url: '/api/test',
      socket: { remoteAddress: '127.0.0.1' }
    };
    res = {
      statusCode: 200,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn(),
    };
  });

  describe('withLogger', () => {
    it('deve logar inicio e fim da requisicao', async () => {
      const handler = jest.fn().mockResolvedValue('ok');
      const middleware = withLogger()(handler);

      await middleware(req, res);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[GET] /api/test - Iniciando'));
      expect(handler).toHaveBeenCalledWith(req, res);
    });
  });

  describe('composeMiddleware', () => {
    it('deve compor middleware na ordem correta', async () => {
      const calls = [];
      const middleware1 = (h) => async (r, s) => { calls.push('m1'); return h(r, s); };
      const middleware2 = (h) => async (r, s) => { calls.push('m2'); return h(r, s); };
      const handler = jest.fn().mockResolvedValue('ok');

      const composed = composeMiddleware(middleware1, middleware2)(handler);
      const result = await composed(req, res);

      expect(calls).toEqual(['m1', 'm2']);
      expect(result).toBe('ok');
    });

    it('deve funcionar com withCors e tratar OPTIONS', async () => {
      req.method = 'OPTIONS';
      const handler = jest.fn();
      const composed = composeMiddleware(withCors())(handler);
      await composed(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.any(String));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('withAuth', () => {
    it('deve retornar 401 se nao houver token', async () => {
      auth.getAuthToken.mockReturnValue(null);
      const handler = jest.fn();
      const middleware = withAuth()(handler);
      await middleware(req, res);

      const { unauthorized } = require('../../../lib/api/response.js');
      expect(unauthorized).toHaveBeenCalledWith(res, 'Token de autenticação não fornecido');
    });

    it('deve retornar 401 se token for invalido', async () => {
      auth.getAuthToken.mockReturnValue('invalid-token');
      auth.verifyToken.mockReturnValue(null);
      const handler = jest.fn();
      const middleware = withAuth()(handler);
      await middleware(req, res);

      const { unauthorized } = require('../../../lib/api/response.js');
      expect(unauthorized).toHaveBeenCalledWith(res, 'Token inválido ou expirado');
    });

    it('deve chamar handler e adicionar user ao req se token valido', async () => {
      auth.getAuthToken.mockReturnValue('valid-token');
      auth.verifyToken.mockReturnValue({ id: 1, name: 'Test', role: 'user' });
      const handler = jest.fn().mockResolvedValue('ok');
      const middleware = withAuth()(handler);
      const result = await middleware(req, res);

      expect(req.user).toEqual({ id: 1, name: 'Test', role: 'user' });
      expect(handler).toHaveBeenCalledWith(req, res);
      expect(result).toBe('ok');
    });
  });

  describe('withRateLimit', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('deve bloquear requisicoes acima do limite', async () => {
      checkRateLimit
        .mockResolvedValueOnce(false) // primeira request
        .mockResolvedValueOnce(true); // segunda request (bloqueada)

      const handler = jest.fn().mockResolvedValue('ok');
      const middleware = withRateLimit({ maxRequests: 1, windowMs: 60000 })(handler);

      // Primeira requisição - deve passar
      await middleware(req, res);
      expect(handler).toHaveBeenCalledTimes(1);

      // Segunda requisição - deve ser bloqueada
      await middleware(req, res);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(tooManyRequests).toHaveBeenCalled();
    });
  });

  describe('withErrorHandler', () => {
    it('deve retornar 500 se handler lancar excecao', async () => {
      handleError.mockImplementation((res, error) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      const handler = jest.fn().mockRejectedValue(new Error('Generic error'));
      const middleware = withErrorHandler()(handler);
      await middleware(req, res);

      expect(handleError).toHaveBeenCalledWith(res, expect.any(Error), false);
    });

    it('deve chamar handler com sucesso', async () => {
      const handler = jest.fn().mockResolvedValue('ok');
      const middleware = withErrorHandler()(handler);
      const result = await middleware(req, res);

      expect(handler).toHaveBeenCalledWith(req, res);
      expect(result).toBe('ok');
    });
  });
});