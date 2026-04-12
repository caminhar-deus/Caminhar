/**
 * @fileoverview API Standardizer - Index
 * 
 * Exporta centralizada de todos os módulos do API Response Standardizer.
 * 
 * @module lib/api
 * @author API Standardizer Team
 * @version 1.0.0
 */

// Exporta todos os módulos de erros
export {
  ApiError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  MethodNotAllowedError
} from './errors.js';

// Exporta todos os módulos de respostas
export {
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
  handleError
} from './response.js';

// Exporta todos os módulos de validação
export {
  formatZodErrors,
  validateBody,
  validateQuery,
  validateParams,
  validateHeaders,
  validateRequest,
  createPaginationSchema,
  createSearchSchema
} from './validate.js';

// Exporta todos os middlewares
export {
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
} from './middleware.js';

// Exporta defaults
import errors from './errors.js';
import response from './response.js';
import validate from './validate.js';
import middleware from './middleware.js';

export default {
  errors,
  response,
  validate,
  middleware,
};
