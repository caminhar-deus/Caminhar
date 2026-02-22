/**
 * @fileoverview Testes Unitários - Response Standardizer
 * 
 * Testes para os utilitários de resposta da API.
 * 
 * @module lib/api/__tests__/response.test
 */

import { 
  success, 
  paginated, 
  created, 
  noContent, 
  updated,
  deleted,
  badRequest, 
  validationError, 
  unauthorized, 
  forbidden, 
  notFound,
  methodNotAllowed,
  conflict,
  tooManyRequests,
  serverError,
  serviceUnavailable,
  handleError,
} from '../../../../lib/api/response.js';

// Mock do response
function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
    end() {
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
  return res;
}

describe('API Response Standardizer', () => {
  describe('Success Responses', () => {
    test('success() deve retornar 200 com estrutura padrão', () => {
      const res = createMockResponse();
      const data = { id: 1, nome: 'Teste' };
      
      success(res, data);
      
      expect(res.statusCode).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toEqual(data);
      expect(res.data.meta).toHaveProperty('timestamp');
      expect(res.data.meta).toHaveProperty('requestId');
    });

    test('success() deve aceitar metadados customizados', () => {
      const res = createMockResponse();
      const meta = { version: '1.0', cache: true };
      
      success(res, {}, meta);
      
      expect(res.data.meta.version).toBe('1.0');
      expect(res.data.meta.cache).toBe(true);
    });

    test('paginated() deve incluir informações de paginação', () => {
      const res = createMockResponse();
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 50 };
      
      paginated(res, data, pagination);
      
      expect(res.statusCode).toBe(200);
      expect(res.data.data).toEqual(data);
      expect(res.data.meta.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      });
    });

    test('created() deve retornar 201 e setar Location header', () => {
      const res = createMockResponse();
      const data = { id: 1, nome: 'Novo' };
      
      created(res, data, '/api/items/1');
      
      expect(res.statusCode).toBe(201);
      expect(res.headers['Location']).toBe('/api/items/1');
      expect(res.data.success).toBe(true);
    });

    test('created() deve funcionar sem Location header', () => {
      const res = createMockResponse();
      
      created(res, { id: 1 });
      
      expect(res.statusCode).toBe(201);
      expect(res.headers['Location']).toBeUndefined();
    });

    test('noContent() deve retornar 204', () => {
      const res = createMockResponse();
      
      noContent(res);
      
      expect(res.statusCode).toBe(204);
    });

    test('updated() deve retornar 200 quando há dados', () => {
      const res = createMockResponse();
      
      updated(res, { id: 1, nome: 'Atualizado' });
      
      expect(res.statusCode).toBe(200);
    });

    test('updated() deve retornar 204 quando não há dados', () => {
      const res = createMockResponse();
      
      updated(res);
      
      expect(res.statusCode).toBe(204);
    });

    test('deleted() deve retornar 200 quando há dados', () => {
      const res = createMockResponse();
      
      deleted(res, { id: 1, nome: 'Removido' });
      
      expect(res.statusCode).toBe(200);
    });

    test('deleted() deve retornar 204 quando não há dados', () => {
      const res = createMockResponse();
      
      deleted(res);
      
      expect(res.statusCode).toBe(204);
    });
  });

  describe('Error Responses', () => {
    test('badRequest() deve retornar 400', () => {
      const res = createMockResponse();
      
      badRequest(res, 'Dados inválidos');
      
      expect(res.statusCode).toBe(400);
      expect(res.data.success).toBe(false);
      expect(res.data.error.code).toBe('BAD_REQUEST');
      expect(res.data.error.message).toBe('Dados inválidos');
    });

    test('badRequest() deve incluir detalhes quando fornecidos', () => {
      const res = createMockResponse();
      const errors = [{ field: 'email', message: 'Email inválido' }];
      
      badRequest(res, 'Dados inválidos', errors);
      
      expect(res.data.error.details).toEqual(errors);
    });

    test('validationError() deve retornar 400 com código VALIDATION_ERROR', () => {
      const res = createMockResponse();
      
      validationError(res, 'Erro de validação', [{ field: 'nome', message: 'Obrigatório' }]);
      
      expect(res.statusCode).toBe(400);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
      expect(res.data.error.details).toHaveLength(1);
    });

    test('unauthorized() deve retornar 401 e setar WWW-Authenticate', () => {
      const res = createMockResponse();
      
      unauthorized(res, 'Token expirado');
      
      expect(res.statusCode).toBe(401);
      expect(res.headers['WWW-Authenticate']).toBe('Bearer');
      expect(res.data.error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('unauthorized() deve usar mensagem padrão', () => {
      const res = createMockResponse();
      
      unauthorized(res);
      
      expect(res.data.error.message).toBe('Não autenticado');
    });

    test('forbidden() deve retornar 403', () => {
      const res = createMockResponse();
      
      forbidden(res, 'Acesso negado');
      
      expect(res.statusCode).toBe(403);
      expect(res.data.error.code).toBe('FORBIDDEN_ERROR');
    });

    test('notFound() deve retornar 404 com mensagem formatada', () => {
      const res = createMockResponse();
      
      notFound(res, 'Música', 123);
      
      expect(res.statusCode).toBe(404);
      expect(res.data.error.code).toBe('NOT_FOUND_ERROR');
      expect(res.data.error.resource).toBe('Música');
      expect(res.data.error.identifier).toBe(123);
    });

    test('notFound() deve funcionar sem identificador', () => {
      const res = createMockResponse();
      
      notFound(res, 'Recurso');
      
      expect(res.statusCode).toBe(404);
      expect(res.data.error.message).toBe('Recurso não encontrado');
    });

    test('methodNotAllowed() deve retornar 405 e setar Allow header', () => {
      const res = createMockResponse();
      
      methodNotAllowed(res, 'DELETE', ['GET', 'POST']);
      
      expect(res.statusCode).toBe(405);
      expect(res.headers['Allow']).toBe('GET, POST');
      expect(res.data.error.allowed).toEqual(['GET', 'POST']);
    });

    test('conflict() deve retornar 409', () => {
      const res = createMockResponse();
      
      conflict(res, 'Email já existe');
      
      expect(res.statusCode).toBe(409);
      expect(res.data.error.code).toBe('CONFLICT_ERROR');
    });

    test('tooManyRequests() deve retornar 429 e setar Retry-After', () => {
      const res = createMockResponse();
      
      tooManyRequests(res, 'Muitas requisições', 60);
      
      expect(res.statusCode).toBe(429);
      expect(res.headers['Retry-After']).toBe(60);
      expect(res.data.meta.retryAfter).toBe(60);
    });

    test('serverError() deve retornar 500', () => {
      const res = createMockResponse();
      
      serverError(res, 'Erro interno');
      
      expect(res.statusCode).toBe(500);
      expect(res.data.error.code).toBe('SERVER_ERROR');
    });

    test('serverError() deve usar mensagem padrão', () => {
      const res = createMockResponse();
      
      serverError(res);
      
      expect(res.data.error.message).toBe('Erro interno do servidor');
    });

    test('serviceUnavailable() deve retornar 503', () => {
      const res = createMockResponse();
      
      serviceUnavailable(res, 'Serviço offline', 120);
      
      expect(res.statusCode).toBe(503);
      expect(res.headers['Retry-After']).toBe(120);
    });

    test('serviceUnavailable() deve funcionar sem retryAfter', () => {
      const res = createMockResponse();
      
      serviceUnavailable(res);
      
      expect(res.statusCode).toBe(503);
      expect(res.headers['Retry-After']).toBeUndefined();
    });
  });

  describe('handleError()', () => {
    test('deve usar toJSON se disponível no erro', () => {
      const res = createMockResponse();
      const customError = {
        toJSON: () => ({ custom: true }),
        statusCode: 418,
      };
      
      handleError(res, customError);
      
      expect(res.statusCode).toBe(418);
      expect(res.data.custom).toBe(true);
    });

    test('deve usar mensagem do erro', () => {
      const res = createMockResponse();
      const error = new Error('Erro customizado');
      
      handleError(res, error);
      
      expect(res.data.error.message).toBe('Erro customizado');
    });

    test('deve incluir stack trace quando solicitado', () => {
      const res = createMockResponse();
      const error = new Error('Com stack');
      
      handleError(res, error, true);
      
      expect(res.data.error.stack).toBeDefined();
    });

    test('deve usar código 500 para erros desconhecidos', () => {
      const res = createMockResponse();
      
      handleError(res, {});
      
      expect(res.statusCode).toBe(500);
    });
  });
});
