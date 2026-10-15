import { z } from 'zod';

/**
 * Schemas Zod de query string: paginação e busca.
 *
 * Camada de VALIDAÇÃO de input — sem dependência de SQL ou de HTTP, para
 * poder ser usada por qualquer rota ou por quem monta query na mão.
 */

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
 * const { page, limit } = paginationSchema.parse(req.query);
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
