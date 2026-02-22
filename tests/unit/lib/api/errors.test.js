/**
 * @fileoverview Testes Unitários - Error Classes
 * 
 * Testes para as classes de erro customizadas.
 * 
 * @module lib/api/__tests__/errors.test
 */

import {
  ApiError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  MethodNotAllowedError,
} from '../../../../lib/api/errors.js';

describe('API Error Classes', () => {
  describe('ApiError (classe base)', () => {
    test('deve criar erro com valores padrão', () => {
      const error = new ApiError('Erro base');
      
      expect(error.message).toBe('Erro base');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.details).toEqual([]);
      expect(error.name).toBe('ApiError');
    });

    test('deve aceitar valores customizados', () => {
      const error = new ApiError('Custom', 400, 'CUSTOM_ERROR', [{ field: 'test' }], { extra: true });
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.details).toEqual([{ field: 'test' }]);
      expect(error.meta).toEqual({ extra: true });
    });

    test('toJSON deve retornar estrutura padrão', () => {
      const error = new ApiError('Test');
      const json = error.toJSON();
      
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INTERNAL_ERROR');
      expect(json.error.message).toBe('Test');
      expect(json.meta).toHaveProperty('timestamp');
      expect(json.meta).toHaveProperty('requestId');
    });

    test('toJSON deve incluir details quando houver', () => {
      const error = new ApiError('Test', 400, 'ERROR', [{ field: 'name', message: 'Required' }]);
      const json = error.toJSON();
      
      expect(json.error.details).toHaveLength(1);
    });
  });

  describe('ValidationError', () => {
    test('deve ter status 400 e código específico', () => {
      const error = new ValidationError('Dados inválidos', [{ field: 'email' }]);
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    test('deve usar mensagem e details padrão', () => {
      const error = new ValidationError();
      
      expect(error.message).toBe('Dados inválidos');
      expect(error.details).toEqual([]);
    });
  });

  describe('AuthenticationError', () => {
    test('deve ter status 401 e código específico', () => {
      const error = new AuthenticationError('Token inválido');
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.name).toBe('AuthenticationError');
    });

    test('deve usar mensagem padrão', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Não autenticado');
    });
  });

  describe('ForbiddenError', () => {
    test('deve ter status 403 e código específico', () => {
      const error = new ForbiddenError('Sem permissão');
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN_ERROR');
      expect(error.name).toBe('ForbiddenError');
    });

    test('deve usar mensagem padrão', () => {
      const error = new ForbiddenError();
      
      expect(error.message).toBe('Acesso negado');
    });
  });

  describe('NotFoundError', () => {
    test('deve ter status 404 e código específico', () => {
      const error = new NotFoundError('Música', 123);
      
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.name).toBe('NotFoundError');
      expect(error.resource).toBe('Música');
      expect(error.identifier).toBe(123);
    });

    test('deve formatar mensagem com identificador numérico', () => {
      const error = new NotFoundError('Música', 123);
      
      expect(error.message).toBe('Música não encontrado');
    });

    test('deve formatar mensagem com identificador string', () => {
      const error = new NotFoundError('Usuário', 'abc');
      
      expect(error.message).toBe('Usuário não encontrado(id: abc)');
    });

    test('deve formatar mensagem sem identificador', () => {
      const error = new NotFoundError('Recurso');
      
      expect(error.message).toBe('Recurso não encontrado');
    });
  });

  describe('ConflictError', () => {
    test('deve ter status 409 e código específico', () => {
      const error = new ConflictError('Conflito de dados');
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT_ERROR');
      expect(error.name).toBe('ConflictError');
    });

    test('deve usar mensagem padrão', () => {
      const error = new ConflictError();
      
      expect(error.message).toBe('Conflito de dados');
    });
  });

  describe('RateLimitError', () => {
    test('deve ter status 429 e código específico', () => {
      const error = new RateLimitError('Muitas requisições', 60);
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.name).toBe('RateLimitError');
      expect(error.retryAfter).toBe(60);
    });

    test('deve incluir retryAfter no toJSON', () => {
      const error = new RateLimitError('Muitas requisições', 120);
      const json = error.toJSON();
      
      expect(json.meta.retryAfter).toBe(120);
    });
  });

  describe('ServerError', () => {
    test('deve ter status 500 e código específico', () => {
      const originalError = new Error('Original');
      const error = new ServerError('Erro no servidor', originalError);
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.name).toBe('ServerError');
      expect(error.originalError).toBe(originalError);
    });

    test('deve usar mensagem padrão', () => {
      const error = new ServerError();
      
      expect(error.message).toBe('Erro interno do servidor');
    });
  });

  describe('ServiceUnavailableError', () => {
    test('deve ter status 503 e código específico', () => {
      const error = new ServiceUnavailableError('Serviço offline', 60);
      
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.name).toBe('ServiceUnavailableError');
      expect(error.retryAfter).toBe(60);
    });

    test('deve funcionar sem retryAfter', () => {
      const error = new ServiceUnavailableError();
      
      expect(error.retryAfter).toBeNull();
    });

    test('deve incluir retryAfter no toJSON quando presente', () => {
      const error = new ServiceUnavailableError('Offline', 30);
      const json = error.toJSON();
      
      expect(json.meta.retryAfter).toBe(30);
    });

    test('não deve incluir retryAfter no toJSON quando ausente', () => {
      const error = new ServiceUnavailableError();
      const json = error.toJSON();
      
      expect(json.meta.retryAfter).toBeUndefined();
    });
  });

  describe('MethodNotAllowedError', () => {
    test('deve ter status 405 e código específico', () => {
      const error = new MethodNotAllowedError('DELETE', ['GET', 'POST']);
      
      expect(error.statusCode).toBe(405);
      expect(error.code).toBe('METHOD_NOT_ALLOWED');
      expect(error.name).toBe('MethodNotAllowedError');
      expect(error.method).toBe('DELETE');
      expect(error.allowed).toEqual(['GET', 'POST']);
    });

    test('deve formatar mensagem corretamente', () => {
      const error = new MethodNotAllowedError('PATCH', ['GET', 'PUT']);
      
      expect(error.message).toBe('Método PATCH não permitido');
    });

    test('deve incluir allowed no toJSON', () => {
      const error = new MethodNotAllowedError('DELETE', ['GET', 'POST', 'PUT']);
      const json = error.toJSON();
      
      expect(json.meta.allowed).toEqual(['GET', 'POST', 'PUT']);
    });
  });
});
