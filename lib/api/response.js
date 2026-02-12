/**
 * @fileoverview API Response Standardizer
 * 
 * Utilitários padronizados para criar respostas de API consistentes.
 * Todas as respostas seguem o formato padrão com sucesso/erro, dados e metadados.
 * 
 * @module lib/api/response
 * @author API Standardizer Team
 * @version 1.0.0
 */

/**
 * Gera UUID v4 simples (fallback quando uuid não está disponível)
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
 * Gera metadados padrão para respostas da API
 * @param {Object} customMeta - Metadados customizados
 * @returns {Object} Metadados completos
 */
function generateMeta(customMeta = {}) {
  return {
    timestamp: new Date().toISOString(),
    requestId: generateUUID(),
    ...customMeta,
  };
}

/**
 * Resposta de sucesso padrão (200 OK)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {any} data - Dados a serem retornados
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * // Retorna dados simples
 * success(res, { id: 1, nome: 'João' });
 * 
 * // Retorna com metadados customizados
 * success(res, { id: 1 }, { version: '1.0', cache: true });
 */
export function success(res, data, meta = {}) {
  return res.status(200).json({
    success: true,
    data,
    meta: generateMeta(meta),
  });
}

/**
 * Resposta paginada (200 OK)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {Array} data - Array de dados
 * @param {Object} pagination - Informações de paginação
 * @param {number} pagination.page - Página atual
 * @param {number} pagination.limit - Itens por página
 * @param {number} pagination.total - Total de itens
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * paginated(res, posts, { page: 1, limit: 10, total: 100 });
 */
export function paginated(res, data, pagination, meta = {}) {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);
  
  return res.status(200).json({
    success: true,
    data,
    meta: generateMeta({
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      ...meta,
    }),
  });
}

/**
 * Resposta de recurso criado (201 Created)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {any} data - Dados do recurso criado
 * @param {string} location - URL do recurso criado (opcional)
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * created(res, { id: 1, nome: 'Novo Item' });
 * created(res, newUser, '/api/users/123');
 */
export function created(res, data, location = null, meta = {}) {
  if (location) {
    res.setHeader('Location', location);
  }
  
  return res.status(201).json({
    success: true,
    data,
    meta: generateMeta(meta),
  });
}

/**
 * Resposta de recurso aceito para processamento (202 Accepted)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {any} data - Dados da operação
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * accepted(res, { taskId: 'abc123', status: 'processing' });
 */
export function accepted(res, data, meta = {}) {
  return res.status(202).json({
    success: true,
    data,
    meta: generateMeta(meta),
  });
}

/**
 * Resposta sem conteúdo (204 No Content)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @returns {void}
 * 
 * @example
 * noContent(res); // Após deletar um recurso
 */
export function noContent(res) {
  return res.status(204).end();
}

/**
 * Resposta de recurso atualizado (200 OK ou 204 No Content)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {any} data - Dados atualizados (opcional)
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * updated(res, { id: 1, nome: 'Atualizado' });
 * updated(res); // Sem dados, retorna 204
 */
export function updated(res, data = null, meta = {}) {
  if (data === null) {
    return noContent(res);
  }
  return success(res, data, meta);
}

/**
 * Resposta de recurso deletado (200 OK ou 204 No Content)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {any} data - Dados do recurso deletado (opcional)
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * deleted(res, { id: 1, nome: 'Removido' });
 * deleted(res); // Sem dados, retorna 204
 */
export function deleted(res, data = null, meta = {}) {
  if (data === null) {
    return noContent(res);
  }
  return success(res, data, meta);
}

// ===== RESPOSTAS DE ERRO =====

/**
 * Erro de requisição inválida (400 Bad Request)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {string} message - Mensagem de erro
 * @param {Array} errors - Lista de erros detalhados
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * badRequest(res, 'Dados inválidos', [
 *   { field: 'email', message: 'Email inválido' }
 * ]);
 */
export function badRequest(res, message = 'Requisição inválida', errors = [], meta = {}) {
  return res.status(400).json({
    success: false,
    error: {
      code: 'BAD_REQUEST',
      message,
      ...(errors.length > 0 && { details: errors }),
    },
    meta: generateMeta(meta),
  });
}

/**
 * Erro de validação (400 Bad Request)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {string} message - Mensagem de erro
 * @param {Array} errors - Lista de erros de validação
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * validationError(res, 'Erro de validação', [
 *   { field: 'titulo', message: 'Título é obrigatório' }
 * ]);
 */
export function validationError(res, message = 'Erro de validação', errors = [], meta = {}) {
  return res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message,
      ...(errors.length > 0 && { details: errors }),
    },
    meta: generateMeta(meta),
  });
}

/**
 * Erro de autenticação (401 Unauthorized)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {string} message - Mensagem de erro
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * unauthorized(res, 'Token expirado');
 * unauthorized(res); // Usa mensagem padrão
 */
export function unauthorized(res, message = 'Não autenticado', meta = {}) {
  res.setHeader('WWW-Authenticate', 'Bearer');
  return res.status(401).json({
    success: false,
    error: {
      code: 'AUTHENTICATION_ERROR',
      message,
    },
    meta: generateMeta(meta),
  });
}

/**
 * Erro de acesso negado (403 Forbidden)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {string} message - Mensagem de erro
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * forbidden(res, 'Você não tem permissão para acessar este recurso');
 */
export function forbidden(res, message = 'Acesso negado', meta = {}) {
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN_ERROR',
      message,
    },
    meta: generateMeta(meta),
  });
}

/**
 * Erro de recurso não encontrado (404 Not Found)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {string} resource - Nome do recurso
 * @param {string|number} identifier - Identificador do recurso
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * notFound(res, 'Música', 123);
 * notFound(res, 'Usuário');
 */
export function notFound(res, resource = 'Recurso', identifier = null, meta = {}) {
  const message = identifier 
    ? `${resource} não encontrado${typeof identifier === 'string' ? '' : `(id: ${identifier})`}`
    : `${resource} não encontrado`;
    
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND_ERROR',
      message,
      ...(identifier && { resource, identifier }),
    },
    meta: generateMeta(meta),
  });
}

/**
 * Erro de método não permitido (405 Method Not Allowed)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {string} method - Método HTTP não permitido
 * @param {Array<string>} allowed - Métodos HTTP permitidos
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * methodNotAllowed(res, 'DELETE', ['GET', 'POST']);
 */
export function methodNotAllowed(res, method, allowed = [], meta = {}) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: `Método ${method} não permitido`,
      allowed,
    },
    meta: generateMeta(meta),
  });
}

/**
 * Erro de conflito (409 Conflict)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {string} message - Mensagem de erro
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * conflict(res, 'Email já está em uso');
 */
export function conflict(res, message = 'Conflito de dados', meta = {}) {
  return res.status(409).json({
    success: false,
    error: {
      code: 'CONFLICT_ERROR',
      message,
    },
    meta: generateMeta(meta),
  });
}

/**
 * Erro de rate limiting (429 Too Many Requests)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {string} message - Mensagem de erro
 * @param {number} retryAfter - Segundos para tentar novamente
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * tooManyRequests(res, 'Muitas requisições', 60);
 */
export function tooManyRequests(res, message = 'Muitas requisições', retryAfter = 60, meta = {}) {
  res.setHeader('Retry-After', retryAfter);
  return res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_ERROR',
      message,
    },
    meta: generateMeta({
      retryAfter,
      ...meta,
    }),
  });
}

/**
 * Erro interno do servidor (500 Internal Server Error)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {string} message - Mensagem de erro
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * serverError(res, 'Erro ao processar requisição');
 * serverError(res); // Usa mensagem padrão
 */
export function serverError(res, message = 'Erro interno do servidor', meta = {}) {
  return res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message,
    },
    meta: generateMeta(meta),
  });
}

/**
 * Erro de serviço indisponível (503 Service Unavailable)
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {string} message - Mensagem de erro
 * @param {number} retryAfter - Segundos para tentar novamente
 * @param {Object} meta - Metadados adicionais
 * @returns {void}
 * 
 * @example
 * serviceUnavailable(res, 'Serviço temporariamente indisponível', 120);
 */
export function serviceUnavailable(res, message = 'Serviço temporariamente indisponível', retryAfter = null, meta = {}) {
  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter);
  }
  
  const response = {
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message,
    },
    meta: generateMeta(meta),
  };
  
  if (retryAfter) {
    response.meta.retryAfter = retryAfter;
  }
  
  return res.status(503).json(response);
}

/**
 * Resposta de erro genérica a partir de uma classe de erro
 * @param {import('http').ServerResponse} res - Objeto de resposta HTTP
 * @param {Error} error - Objeto de erro
 * @param {boolean} includeStack - Incluir stack trace (apenas desenvolvimento)
 * @returns {void}
 * 
 * @example
 * try {
 *   // código...
 * } catch (error) {
 *   handleError(res, error, process.env.NODE_ENV === 'development');
 * }
 */
export function handleError(res, error, includeStack = false) {
  // Se for um erro da API customizado, usar toJSON
  if (error.toJSON && typeof error.toJSON === 'function') {
    const json = error.toJSON();
    return res.status(error.statusCode || 500).json(json);
  }
  
  // Erros comuns
  const statusCode = error.statusCode || error.code || 500;
  const code = error.name?.replace('Error', '_ERROR').toUpperCase() || 'SERVER_ERROR';
  
  const response = {
    success: false,
    error: {
      code,
      message: error.message || 'Erro interno do servidor',
    },
    meta: generateMeta(),
  };
  
  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }
  
  return res.status(typeof statusCode === 'number' ? statusCode : 500).json(response);
}

export default {
  success,
  paginated,
  created,
  accepted,
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
};
