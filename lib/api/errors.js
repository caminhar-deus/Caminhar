/**
 * @fileoverview Custom API Error Classes
 * 
 * Classes de erro customizadas para a API, permitindo
 * respostas de erro consistentes e com códigos HTTP apropriados.
 * 
 * @module lib/api/errors
 * @author API Standardizer Team
 * @version 1.0.0
 */

/**
 * Gera UUID v4 simples
 * @returns {string} UUID gerado
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Classe base para todos os erros da API
 * @class ApiError
 * @extends Error
 */
export class ApiError extends Error {
  /**
   * @param {string} message - Mensagem de erro
   * @param {number} statusCode - Código HTTP de status
   * @param {string} code - Código do erro (ex: 'VALIDATION_ERROR')
   * @param {Array} details - Detalhes adicionais do erro
   * @param {Object} meta - Metadados adicionais
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = [], meta = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
    this.requestId = generateUUID();
    
    // Mantém o stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converte o erro para formato JSON de resposta
   * @returns {Object} Objeto formatado para resposta API
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details.length > 0 && { details: this.details }),
      },
      meta: {
        timestamp: this.timestamp,
        requestId: this.requestId,
        ...this.meta,
      },
    };
  }
}

/**
 * Erro de validação de dados (400)
 * @class ValidationError
 * @extends ApiError
 */
export class ValidationError extends ApiError {
  /**
   * @param {string} message - Mensagem de erro
   * @param {Array} errors - Lista de erros de validação [{ field, message }]
   * @param {Object} meta - Metadados adicionais
   * 
   * @example
   * throw new ValidationError('Dados inválidos', [
   *   { field: 'email', message: 'Email inválido' },
   *   { field: 'senha', message: 'Senha deve ter no mínimo 8 caracteres' }
   * ]);
   */
  constructor(message = 'Dados inválidos', errors = [], meta = {}) {
    super(message, 400, 'VALIDATION_ERROR', errors, meta);
    this.name = 'ValidationError';
  }
}

/**
 * Erro de autenticação (401)
 * @class AuthenticationError
 * @extends ApiError
 */
export class AuthenticationError extends ApiError {
  /**
   * @param {string} message - Mensagem de erro
   * @param {Object} meta - Metadados adicionais
   * 
   * @example
   * throw new AuthenticationError('Token expirado');
   */
  constructor(message = 'Não autenticado', meta = {}) {
    super(message, 401, 'AUTHENTICATION_ERROR', [], meta);
    this.name = 'AuthenticationError';
  }
}

/**
 * Erro de autorização/permisão (403)
 * @class ForbiddenError
 * @extends ApiError
 */
export class ForbiddenError extends ApiError {
  /**
   * @param {string} message - Mensagem de erro
   * @param {Object} meta - Metadados adicionais
   * 
   * @example
   * throw new ForbiddenError('Você não tem permissão para acessar este recurso');
   */
  constructor(message = 'Acesso negado', meta = {}) {
    super(message, 403, 'FORBIDDEN_ERROR', [], meta);
    this.name = 'ForbiddenError';
  }
}

/**
 * Erro de recurso não encontrado (404)
 * @class NotFoundError
 * @extends ApiError
 */
export class NotFoundError extends ApiError {
  /**
   * @param {string} resource - Nome do recurso não encontrado
   * @param {string|number} identifier - Identificador do recurso
   * @param {Object} meta - Metadados adicionais
   * 
   * @example
   * throw new NotFoundError('Música', 123);
   * throw new NotFoundError('Usuário', 'admin');
   */
  constructor(resource = 'Recurso', identifier = null, meta = {}) {
    const message = identifier 
      ? `${resource} não encontrado${typeof identifier === 'number' ? '' : `(id: ${identifier})`}`
      : `${resource} não encontrado`;
    super(message, 404, 'NOT_FOUND_ERROR', [], meta);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.identifier = identifier;
  }
}

/**
 * Erro de conflito (409) - geralmente recurso já existe
 * @class ConflictError
 * @extends ApiError
 */
export class ConflictError extends ApiError {
  /**
   * @param {string} message - Mensagem de erro
   * @param {Object} meta - Metadados adicionais
   * 
   * @example
   * throw new ConflictError('Email já está em uso');
   */
  constructor(message = 'Conflito de dados', meta = {}) {
    super(message, 409, 'CONFLICT_ERROR', [], meta);
    this.name = 'ConflictError';
  }
}

/**
 * Erro de rate limiting (429)
 * @class RateLimitError
 * @extends ApiError
 */
export class RateLimitError extends ApiError {
  /**
   * @param {string} message - Mensagem de erro
   * @param {number} retryAfter - Segundos para tentar novamente
   * @param {Object} meta - Metadados adicionais
   * 
   * @example
   * throw new RateLimitError('Muitas requisições', 60);
   */
  constructor(message = 'Muitas requisições', retryAfter = 60, meta = {}) {
    super(message, 429, 'RATE_LIMIT_ERROR', [], { retryAfter, ...meta });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Erro do servidor (500)
 * @class ServerError
 * @extends ApiError
 */
export class ServerError extends ApiError {
  /**
   * @param {string} message - Mensagem de erro
   * @param {Error} originalError - Erro original para logging
   * @param {Object} meta - Metadados adicionais
   * 
   * @example
   * throw new ServerError('Erro ao processar pagamento', error);
   */
  constructor(message = 'Erro interno do servidor', originalError = null, meta = {}) {
    super(message, 500, 'SERVER_ERROR', [], meta);
    this.name = 'ServerError';
    this.originalError = originalError;
  }
}

/**
 * Erro de serviço não disponível (503)
 * @class ServiceUnavailableError
 * @extends ApiError
 */
export class ServiceUnavailableError extends ApiError {
  /**
   * @param {string} message - Mensagem de erro
   * @param {number} retryAfter - Segundos para tentar novamente
   * @param {Object} meta - Metadados adicionais
   * 
   * @example
   * throw new ServiceUnavailableError('Serviço de email temporariamente indisponível', 120);
   */
  constructor(message = 'Serviço temporariamente indisponível', retryAfter = null, meta = {}) {
    super(message, 503, 'SERVICE_UNAVAILABLE', [], meta);
    this.name = 'ServiceUnavailableError';
    this.retryAfter = retryAfter;
  }

  /**
   * @override
   */
  toJSON() {
    const json = super.toJSON();
    if (this.retryAfter) {
      json.meta.retryAfter = this.retryAfter;
    }
    return json;
  }
}

/**
 * Erro de método não permitido (405)
 * @class MethodNotAllowedError
 * @extends ApiError
 */
export class MethodNotAllowedError extends ApiError {
  /**
   * @param {string} method - Método HTTP não permitido
   * @param {Array<string>} allowed - Métodos HTTP permitidos
   * @param {Object} meta - Metadados adicionais
   * 
   * @example
   * throw new MethodNotAllowedError('DELETE', ['GET', 'POST', 'PUT']);
   */
  constructor(method, allowed = [], meta = {}) {
    super(
      `Método ${method} não permitido`,
      405,
      'METHOD_NOT_ALLOWED',
      [],
      { allowed, ...meta }
    );
    this.name = 'MethodNotAllowedError';
    this.method = method;
    this.allowed = allowed;
  }
}

export default {
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
};
