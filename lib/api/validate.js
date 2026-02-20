/**
 * @fileoverview API Validation Middleware
 * 
 * Middlewares de validação usando Zod para garantir
 * que os dados de entrada estão corretos antes de processar.
 * 
 * @module lib/api/validate
 * @author API Standardizer Team
 * @version 1.0.0
 */

import { z } from 'zod';
import { validationError } from './response.js';

/**
 * Converte erros do Zod para formato padronizado
 * @param {z.ZodError} zodError - Erro de validação do Zod
 * @returns {Array} Lista de erros formatados
 */
function formatZodErrors(zodError) {
  return zodError.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    ...(err.code && { code: err.code }),
  }));
}

/**
 * Middleware para validar o corpo da requisição (body)
 * @param {z.ZodSchema} schema - Schema Zod para validação
 * @returns {Function} Middleware function
 * 
 * @example
 * import { z } from 'zod';
 * 
 * const schema = z.object({
 *   titulo: z.string().min(1, 'Título é obrigatório'),
 *   artista: z.string().optional(),
 * });
 * 
 * export default function handler(req, res) {
 *   // Validação automática antes de chegar aqui
 * }
 * 
 * export const config = {
 *   api: {
 *     bodyParser: true,
 *   },
 * };
 * 
 * // Uso com composeMiddleware
 * export default composeMiddleware(
 *   validateBody(schema),
 *   handler
 * );
 */
export function validateBody(schema) {
  return (handler) => async (req, res) => {
    // Só valida para métodos que têm body
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return handler(req, res);
    }

    try {
      // Parse e validação do body
      req.body = schema.parse(req.body);
      return handler(req, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationError(res, 'Erro de validação no corpo da requisição', formatZodErrors(error));
      }
      
      // Erro inesperado
      console.error('Erro inesperado na validação do body:', error);
      return validationError(res, 'Erro ao validar dados da requisição');
    }
  };
}

/**
 * Middleware para validar query parameters
 * @param {z.ZodSchema} schema - Schema Zod para validação
 * @returns {Function} Middleware function
 * 
 * @example
 * const querySchema = z.object({
 *   page: z.string().optional().transform(Number).default('1'),
 *   limit: z.string().optional().transform(Number).default('10'),
 *   search: z.string().optional(),
 * });
 * 
 * export default composeMiddleware(
 *   validateQuery(querySchema),
 *   handler
 * );
 */
export function validateQuery(schema) {
  return (handler) => async (req, res) => {
    try {
      // Parse e validação dos query params
      req.query = schema.parse(req.query);
      return handler(req, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationError(res, 'Erro de validação nos parâmetros da URL', formatZodErrors(error));
      }
      
      console.error('Erro inesperado na validação dos query params:', error);
      return validationError(res, 'Erro ao validar parâmetros da URL');
    }
  };
}

/**
 * Middleware para validar parâmetros de rota dinâmica
 * @param {z.ZodSchema} schema - Schema Zod para validação
 * @returns {Function} Middleware function
 * 
 * @example
 * // Para rota /api/musicas/[id].js
 * const paramsSchema = z.object({
 *   id: z.string().regex(/^\d+$/, 'ID deve ser um número'),
 * });
 * 
 * export default composeMiddleware(
 *   validateParams(paramsSchema),
 *   handler
 * );
 */
export function validateParams(schema) {
  return (handler) => async (req, res) => {
    try {
      // Parse e validação dos params
      req.params = schema.parse(req.query); // Next.js coloca params em req.query
      return handler(req, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationError(res, 'Erro de validação nos parâmetros da rota', formatZodErrors(error));
      }
      
      console.error('Erro inesperado na validação dos params:', error);
      return validationError(res, 'Erro ao validar parâmetros da rota');
    }
  };
}

/**
 * Middleware para validar headers específicos
 * @param {z.ZodSchema} schema - Schema Zod para validação
 * @returns {Function} Middleware function
 * 
 * @example
 * const headersSchema = z.object({
 *   'x-api-key': z.string().min(1, 'API Key é obrigatória'),
 * });
 * 
 * export default composeMiddleware(
 *   validateHeaders(headersSchema),
 *   handler
 * );
 */
export function validateHeaders(schema) {
  return (handler) => async (req, res) => {
    try {
      // Headers em Next.js são case-insensitive
      const normalizedHeaders = {};
      for (const [key, value] of Object.entries(req.headers)) {
        normalizedHeaders[key.toLowerCase()] = value;
      }
      
      schema.parse(normalizedHeaders);
      return handler(req, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationError(res, 'Erro de validação nos headers', formatZodErrors(error));
      }
      
      console.error('Erro inesperado na validação dos headers:', error);
      return validationError(res, 'Erro ao validar headers');
    }
  };
}

/**
 * Validação completa de requisição (body + query + params)
 * @param {Object} schemas - Objeto com schemas
 * @param {z.ZodSchema} schemas.body - Schema para body
 * @param {z.ZodSchema} schemas.query - Schema para query params
 * @param {z.ZodSchema} schemas.params - Schema para route params
 * @returns {Function} Middleware function
 * 
 * @example
 * const schemas = {
 *   body: z.object({ titulo: z.string() }),
 *   query: z.object({ page: z.string().optional() }),
 * };
 * 
 * export default composeMiddleware(
 *   validateRequest(schemas),
 *   handler
 * );
 */
export function validateRequest(schemas = {}) {
  return (handler) => async (req, res) => {
    const allErrors = [];
    
    // Valida body
    if (schemas.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        req.body = schemas.body.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          allErrors.push(...formatZodErrors(error).map(e => ({ ...e, location: 'body' })));
        }
      }
    }
    
    // Valida query
    if (schemas.query) {
      try {
        req.query = schemas.query.parse(req.query);
      } catch (error) {
        if (error instanceof z.ZodError) {
          allErrors.push(...formatZodErrors(error).map(e => ({ ...e, location: 'query' })));
        }
      }
    }
    
    // Valida params
    if (schemas.params) {
      try {
        req.params = schemas.params.parse(req.query);
      } catch (error) {
        if (error instanceof z.ZodError) {
          allErrors.push(...formatZodErrors(error).map(e => ({ ...e, location: 'params' })));
        }
      }
    }
    
    // Se houver erros, retorna resposta de erro
    if (allErrors.length > 0) {
      return validationError(res, 'Erro de validação na requisição', allErrors);
    }
    
    return handler(req, res);
  };
}

/**
 * Helper para criar schemas de paginação comuns
 * @param {Object} options - Opções
 * @param {number} options.defaultPage - Página padrão
 * @param {number} options.defaultLimit - Limite padrão
 * @param {number} options.maxLimit - Limite máximo
 * @returns {z.ZodSchema} Schema de paginação
 * 
 * @example
 * const paginationSchema = createPaginationSchema({ defaultLimit: 20, maxLimit: 100 });
 * 
 * export default composeMiddleware(
 *   validateQuery(paginationSchema),
 *   handler
 * );
 */
export function createPaginationSchema(options = {}) {
  const { defaultPage = 1, defaultLimit = 10, maxLimit = 100 } = options;
  
  return z.object({
    page: z
      .string()
      .optional()
      .transform((val) => {
        const num = parseInt(val, 10);
        return isNaN(num) || num < 1 ? defaultPage : num;
      }),
    limit: z
      .string()
      .optional()
      .transform((val) => {
        const num = parseInt(val, 10);
        return isNaN(num) || num < 1 ? defaultLimit : Math.min(num, maxLimit);
      }),
  });
}

/**
 * Helper para criar schema de busca
 * @param {Object} options - Opções
 * @param {number} options.minLength - Tamanho mínimo da busca
 * @param {number} options.maxLength - Tamanho máximo da busca
 * @returns {z.ZodSchema} Schema de busca
 * 
 * @example
 * const searchSchema = createSearchSchema({ minLength: 2 });
 */
export function createSearchSchema(options = {}) {
  const { minLength = 1, maxLength = 100 } = options;
  
  return z.object({
    search: z
      .string()
      .min(minLength, `Busca deve ter no mínimo ${minLength} caracteres`)
      .max(maxLength, `Busca deve ter no máximo ${maxLength} caracteres`)
      .optional(),
  });
}

export default {
  validateBody,
  validateQuery,
  validateParams,
  validateHeaders,
  validateRequest,
  createPaginationSchema,
  createSearchSchema,
  formatZodErrors,
};
