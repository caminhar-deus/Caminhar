/**
 * Helpers - Roles
 * Simula o que a coluna TEXT `roles.permissions` devolve do banco:
 * uma string JSON (ex: '["A","B"]'), e não um array.
 *
 * Uso:
 *   import { mockRolePermissions } from '../helpers/roles.js';
 *   query.mockResolvedValueOnce({ rows: [{ permissions: mockRolePermissions(['A']) }] });
 */

/**
 * Serializa permissões no formato exato que o driver do banco devolve
 * para a coluna TEXT (string JSON).
 *
 * @param {string[]|undefined} value - Array de permissões ou `undefined`.
 * @returns {string|undefined} O array serializado como string JSON (ex: '["A","B"]'),
 *                             ou `undefined` quando a entrada é `undefined`.
 */
export function mockRolePermissions(value) {
  if (value === undefined) return undefined;
  return JSON.stringify(value);
}
