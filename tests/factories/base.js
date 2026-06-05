/**
 * Base Factory
 * Abstrai o padrão comum de todas as factories:
 * - Contador incremental
 * - Método .list(n, overrides, mapFn)
 * - Método .resetId()
 * - Geração de timestamps padrão
 *
 * Uso:
 *   const myFactory = createBaseFactory((id) => ({
 *     id,
 *     name: `Item ${id}`,
 *     created_at: generateTimestamp(id),
 *     updated_at: new Date().toISOString(),
 *   }));
 */

/**
 * Gera timestamp no formato ISO
 * @param {number} daysAgo - Dias atrás para o timestamp
 * @returns {string} Timestamp ISO
 */
export const generateTimestamp = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

/**
 * Cria uma factory base com contador, list() e resetId()
 * @param {Function} defaultsGenerator - Função que recebe (id) e retorna objeto base
 * @returns {Function} Factory function com .list() e .resetId()
 */
export function createBaseFactory(defaultsGenerator) {
  let idCounter = 1;

  const factory = (overrides = {}) => {
    const id = overrides.id ?? idCounter;
    if (!('id' in overrides)) {
      idCounter++;
    }
    const defaults = defaultsGenerator(id);
    return { ...defaults, ...overrides };
  };

  /**
   * Cria múltiplos registros
   * @param {number} count - Quantidade de registros
   * @param {Object} overrides - Propriedades para sobrescrever em todos
   * @param {Function} [mapFn] - Função para mapear cada registro
   * @returns {Array} Lista de registros
   */
  factory.list = (count = 1, overrides = {}, mapFn) => {
    const items = Array.from({ length: count }, () => factory(overrides));
    return mapFn ? items.map(mapFn) : items;
  };

  /**
   * Reseta o contador de IDs
   * Substitui as funções reset*IdCounter individuais
   */
  factory.resetId = () => {
    idCounter = 1;
  };

  return factory;
}