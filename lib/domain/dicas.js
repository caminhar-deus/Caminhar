/**
 * Domínio de Dicas do Dia.
 *
 * Centraliza a lógica de paginação e busca no banco de dados,
 * seguindo o padrão dos demais domínios (lib/domain/categories.js).
 */
import { paginate } from './shared-pagination.js';

/**
 * Lista dicas paginadas com busca em `name` e `content`.
 * @param {number} [page=1] - Número da página (base 1).
 * @param {number} [limit=10] - Itens por página.
 * @param {string} [search=''] - Termo de busca opcional.
 * @returns {Promise<Object>} Dicas paginadas com metadados { data, pagination }.
 */
export async function getPaginatedDicas(page = 1, limit = 10, search = '') {
  return paginate('dicas', {
    page,
    limit,
    search,
    orderBy: 'id ASC',
    searchOptions: { fields: ['name', 'content'] },
  });
}
