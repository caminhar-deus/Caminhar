/**
 * @fileoverview API Middleware Composition
 * 
 * Composição de middlewares para APIs Next.js com
 * suporte a autenticação, validação, rate limiting e controle de métodos.
 * 
 * @module lib/api/middleware
 * @author API Standardizer Team
 * @version 1.0.0
 */

import { getAuthToken, verifyToken } from '../auth.js';
import { 
  success, 
  methodNotAllowed, 
  unauthorized, 
  tooManyRequests,
  serverError,
  handleError
} from './response.js';

/**
 * Composição de múltiplos middlewares
 * Executa middlewares da esquerda para direita
 * @param {...Function} middlewares - Lista de middlewares
 * @returns {Function} Handler composto
 * 
 * @example
 * export default composeMiddleware(
 *   withCors(),
 *   withRateLimit({ maxRequests: 100 }),
 *   withAuth(),
 *   withMethod(['GET', 'POST']),
 *   handler
 * );
 */
export function composeMiddleware(...middlewares) {
  return (handler) => {
    // Aplica middlewares de trás para frente
    return middlewares.reduceRight(
      (wrappedHandler, middleware) => middleware(wrappedHandler),
      handler
    );
  };
}

/**
 * Middleware de controle de métodos HTTP
 * @param {Array<string>} allowedMethods - Métodos permitidos
 * @returns {Function} Middleware function
 * 
 * @example
 * export default composeMiddleware(
 *   withMethod(['GET', 'POST']),
 *   handler
 * );
 */
export function withMethod(allowedMethods) {
  return (handler) => async (req, res) => {
    if (!allowedMethods.includes(req.method)) {
      return methodNotAllowed(res, req.method, allowedMethods);
    }
    return handler(req, res);
  };
}

/**
 * Middleware de autenticação
 * @param {Object} options - Opções de autenticação
 * @param {Array<string>} options.roles - Papéis permitidos (opcional)
 * @param {boolean} options.allowApiKey - Permitir autenticação via API Key
 * @returns {Function} Middleware function
 * 
 * @example
 * // Autenticação básica
 * export default composeMiddleware(
 *   withAuth(),
 *   handler
 * );
 * 
 * // Com controle de roles
 * export default composeMiddleware(
 *   withAuth({ roles: ['admin'] }),
 *   handler
 * );
 */
export function withAuth(options = {}) {
  const { roles = [], allowApiKey = false } = options;

  return (handler) => async (req, res) => {
    const token = getAuthToken(req);
    
    if (!token) {
      return unauthorized(res, 'Token de autenticação não fornecido');
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return unauthorized(res, 'Token inválido ou expirado');
    }

    // Verifica roles se especificados
    if (roles.length > 0 && !roles.includes(decoded.role)) {
      return unauthorized(res, 'Permissão insuficiente');
    }

    // Adiciona informações do usuário ao request
    req.user = decoded;
    
    return handler(req, res);
  };
}

/**
 * Middleware de autenticação opcional
 * Não retorna erro se não houver token, apenas não adiciona user ao req
 * @returns {Function} Middleware function
 * 
 * @example
 * export default composeMiddleware(
 *   withOptionalAuth(),
 *   handler
 * );
 * 
 * // No handler
 * if (req.user) {
 *   // Usuário autenticado
 * } else {
 *   // Usuário anônimo
 * }
 */
export function withOptionalAuth() {
  return (handler) => async (req, res) => {
    const token = getAuthToken(req);
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }
    
    return handler(req, res);
  };
}

/**
 * Middleware de Rate Limiting
 * @param {Object} options - Opções de rate limiting
 * @param {number} options.maxRequests - Número máximo de requisições
 * @param {number} options.windowMs - Janela de tempo em milissegundos
 * @param {string} options.keyGenerator - Função para gerar chave de identificação
 * @returns {Function} Middleware function
 * 
 * @example
 * export default composeMiddleware(
 *   withRateLimit({ maxRequests: 100, windowMs: 15 * 60 * 1000 }),
 *   handler
 * );
 * 
 * @example
 * // Rate limit diferente para usuários autenticados
 * export default composeMiddleware(
 *   withOptionalAuth(),
 *   withRateLimit({
 *     maxRequests: (req) => req.user ? 1000 : 100,
 *     windowMs: 15 * 60 * 1000,
 *   }),
 *   handler
 * );
 */
export function withRateLimit(options = {}) {
  const {
    maxRequests = 100,
    windowMs = 15 * 60 * 1000, // 15 minutos
    keyGenerator = null,
  } = options;

  // Store em memória (em produção usar Redis)
  const requestCounts = new Map();

  // Função para limpar entradas antigas periodicamente
  const cleanup = () => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.timestamp > windowMs) {
        requestCounts.delete(key);
      }
    }
  };

  // Limpa a cada 5 minutos
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 5 * 60 * 1000);
  }

  return (handler) => async (req, res) => {
    // Gera chave de identificação
    const key = keyGenerator 
      ? keyGenerator(req)
      : `${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}-${req.url}`;

    const now = Date.now();
    
    // Obtém ou inicializa contador
    let requestData = requestCounts.get(key);
    
    if (!requestData || now - requestData.timestamp > windowMs) {
      requestData = { timestamp: now, count: 0 };
    }

    // Calcula o limite (pode ser função ou número)
    const limit = typeof maxRequests === 'function' ? maxRequests(req) : maxRequests;

    // Verifica se excedeu o limite
    if (requestData.count >= limit) {
      const retryAfter = Math.ceil((requestData.timestamp + windowMs - now) / 1000);
      return tooManyRequests(res, 'Muitas requisições, tente novamente mais tarde', retryAfter);
    }

    // Incrementa contador
    requestData.count++;
    requestCounts.set(key, requestData);

    // Adiciona headers informativos
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - requestData.count));

    return handler(req, res);
  };
}

/**
 * Middleware de CORS
 * @param {Object} options - Opções CORS
 * @param {Array<string>} options.origins - Origens permitidas
 * @param {Array<string>} options.methods - Métodos permitidos
 * @param {Array<string>} options.headers - Headers permitidos
 * @returns {Function} Middleware function
 * 
 * @example
 * export default composeMiddleware(
 *   withCors({ origins: ['https://example.com'] }),
 *   handler
 * );
 */
export function withCors(options = {}) {
  const {
    origins = ['*'],
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials = true,
  } = options;

  return (handler) => async (req, res) => {
    const origin = req.headers.origin;
    
    // Verifica se a origem é permitida
    if (origins.includes('*') || origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', headers.join(', '));
    
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Responde preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    return handler(req, res);
  };
}

/**
 * Middleware de tratamento de erros
 * Captura erros e retorna resposta padronizada
 * @param {Object} options - Opções
 * @param {boolean} options.includeStack - Incluir stack trace (apenas dev)
 * @returns {Function} Middleware function
 * 
 * @example
 * export default composeMiddleware(
 *   withErrorHandler({ includeStack: process.env.NODE_ENV === 'development' }),
 *   handler
 * );
 */
export function withErrorHandler(options = {}) {
  const { includeStack = false } = options;

  return (handler) => async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      return handleError(res, error, includeStack);
    }
  };
}

/**
 * Middleware de logging de requisições
 * @param {Object} options - Opções de logging
 * @param {Function} options.logger - Função de logging
 * @returns {Function} Middleware function
 * 
 * @example
 * export default composeMiddleware(
 *   withLogger(),
 *   handler
 * );
 */
export function withLogger(options = {}) {
  const { logger = console.log } = options;

  return (handler) => async (req, res) => {
    const start = Date.now();
    
    logger(`[${req.method}] ${req.url} - Iniciando`);

    // Sobrescreve res.end para capturar quando a resposta termina
    const originalEnd = res.end.bind(res);
    res.end = (...args) => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      logger(`[${req.method}] ${req.url} - ${status} (${duration}ms)`);
      return originalEnd(...args);
    };

    return handler(req, res);
  };
}

/**
 * Middleware de timeout
 * @param {number} timeoutMs - Timeout em milissegundos
 * @returns {Function} Middleware function
 * 
 * @example
 * export default composeMiddleware(
 *   withTimeout(5000), // 5 segundos
 *   handler
 * );
 */
export function withTimeout(timeoutMs = 10000) {
  return (handler) => async (req, res) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        serverError(res, 'Tempo de requisição excedido');
      }
    }, timeoutMs);

    try {
      const result = await handler(req, res);
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  };
}

/**
 * Middleware de parse de JSON com tamanho limitado
 * @param {Object} options - Opções
 * @param {number} options.limit - Limite de tamanho em bytes
 * @returns {Function} Middleware function
 * 
 * @example
 * export default composeMiddleware(
 *   withBodyParser({ limit: 1024 * 1024 }), // 1MB
 *   handler
 * );
 */
export function withBodyParser(options = {}) {
  const { limit = 1024 * 1024 } = options; // 1MB padrão

  return (handler) => async (req, res) => {
    // Next.js já faz parse do body automaticamente
    // Este middleware é mais para validação de tamanho
    
    if (req.body && JSON.stringify(req.body).length > limit) {
      return serverError(res, 'Corpo da requisição excede o tamanho máximo permitido');
    }

    return handler(req, res);
  };
}

/**
 * Combinação padrão de middlewares para APIs públicas
 * @param {Function} handler - Handler da API
 * @param {Object} options - Opções
 * @returns {Function} Handler composto
 * 
 * @example
 * export default publicApi(handler, { rateLimit: { maxRequests: 200 } });
 */
export function publicApi(handler, options = {}) {
  const { rateLimit = {} } = options;
  
  return composeMiddleware(
    withCors(),
    withErrorHandler(),
    withRateLimit({ maxRequests: 100, ...rateLimit }),
    withLogger(),
    withMethod(['GET']),
    handler
  );
}

/**
 * Combinação padrão de middlewares para APIs autenticadas
 * @param {Function} handler - Handler da API
 * @param {Object} options - Opções
 * @returns {Function} Handler composto
 * 
 * @example
 * export default protectedApi(handler, { 
 *   roles: ['admin'],
 *   methods: ['GET', 'POST', 'PUT', 'DELETE']
 * });
 */
export function protectedApi(handler, options = {}) {
  const { 
    roles = [], 
    methods = ['GET', 'POST', 'PUT', 'DELETE'],
    rateLimit = {}
  } = options;

  return composeMiddleware(
    withCors(),
    withErrorHandler(),
    withRateLimit({ maxRequests: 1000, ...rateLimit }),
    withLogger(),
    withMethod(methods),
    withAuth({ roles }),
    handler
  );
}

/**
 * Middleware de cache simples
 * @param {number} maxAge - Tempo de cache em segundos
 * @returns {Function} Middleware function
 * 
 * @example
 * export default composeMiddleware(
 *   withCache(60), // Cache de 1 minuto
 *   handler
 * );
 */
export function withCache(maxAge = 60) {
  return (handler) => async (req, res) => {
    // Só aplica cache em GET
    if (req.method !== 'GET') {
      return handler(req, res);
    }

    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    return handler(req, res);
  };
}

export default {
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
  protectedApi,
};
