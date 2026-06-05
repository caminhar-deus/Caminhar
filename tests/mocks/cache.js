/**
 * Cache Mocks
 * Mocks para operações de cache (Redis/memória)
 *
 * Uso em testes de integração:
 *   jest.mock('../../../lib/cache.js', () => require('../../mocks/cache').mockCacheModule());
 */

/**
 * Cria um módulo de cache mockado
 * @param {Object} overrides - Sobrescreve funções específicas
 * @returns {Object} Módulo cache mockado
 */
export const mockCacheModule = (overrides = {}) => ({
  getOrSetCache: jest.fn(async (key, fetchFunction) => await fetchFunction()),
  checkRateLimit: jest.fn().mockResolvedValue(false),
  invalidateCache: jest.fn(),
  ...overrides,
});

/**
 * Reseta todos os mocks de cache para seus comportamentos padrão
 * @param {Object} cacheMock - Módulo de cache mockado
 */
export const resetCacheMocks = (cacheMock) => {
  cacheMock.getOrSetCache?.mockImplementation(async (key, fetchFunction) => await fetchFunction());
  cacheMock.checkRateLimit?.mockResolvedValue(false);
  cacheMock.invalidateCache?.mockClear();
};