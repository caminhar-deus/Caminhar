/**
 * Helper de paginação reutilizável para endpoints da API.
 *
 * Uso:
 *   import { paginate } from '../helper/pagination.js';
 *   const { page, limit, offset } = paginate(req.query.page, req.query.limit);
 *
 * Formata resposta padronizada:
 *   paginatedResponse(data, pagination) → { success, data, pagination }
 */

/**
 * Parseia e valida parâmetros de paginação de uma requisição.
 * @param {string|number} rawPage - Valor bruto do parâmetro page
 * @param {string|number} rawLimit - Valor bruto do parâmetro limit
 * @param {number} [maxLimit=100] - Limite máximo permitido
 * @returns {{ page: number, limit: number, offset: number }}
 * @throws {Error} Se os parâmetros forem inválidos
 */
export function paginate(rawPage, rawLimit, maxLimit = 100) {
  const parsedPage = parseInt(rawPage, 10);
  const page = !isNaN(parsedPage) ? parsedPage : 1;

  const parsedLimit = parseInt(rawLimit, 10);
  const limit = !isNaN(parsedLimit) ? parsedLimit : 10;

  if (page < 1 || limit < 1 || limit > maxLimit) {
    throw new Error('INVALID_PAGINATION_PARAMS');
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Formata os metadados de paginação.
 * @param {number} page - Página atual
 * @param {number} limit - Itens por página
 * @param {number} total - Total de itens
 * @returns {{ page: number, limit: number, total: number, totalPages: number }}
 */
export function buildPaginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Monta a resposta padronizada com paginação.
 * @param {Array} data - Lista de itens da página
 * @param {object} pagination - Metadados de paginação (page, limit, total, totalPages)
 * @returns {{ success: boolean, data: Array, pagination: object }}
 */
export function paginatedResponse(data, pagination) {
  return {
    success: true,
    data,
    pagination,
  };
}