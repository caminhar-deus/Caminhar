/**
 * DB Module Mocks
 * Mock centralizado para o módulo lib/db.js
 *
 * Uso em testes:
 *   jest.mock('../../../lib/db.js', () => require('../../mocks/db-module').mockDb());
 */

/**
 * Cria um módulo db.js mockado completo
 * Exporta exatamente as mesmas funções que lib/db.js
 * @param {Object} overrides - Sobrescreve funções específicas
 * @returns {Object} Módulo db mockado
 */
export const mockDb = (overrides = {}) => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  resetPool: jest.fn(),
  closeDatabase: jest.fn().mockResolvedValue(undefined),
  transaction: jest.fn(async (callback) => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    };
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
  healthCheck: jest.fn().mockResolvedValue(true),
  getDatabaseInfo: jest.fn().mockResolvedValue({
    version: 'PostgreSQL 15.0',
    activeConnections: 1,
    sizeBytes: 1024,
    timestamp: new Date().toISOString(),
  }),
  ...overrides,
});

/**
 * Cria um módulo db.js que SIMULA ERRO de conexão
 * @param {Error} error - Erro a ser lançado
 * @returns {Object} Módulo db mockado com erro
 */
export const mockDbError = (error = new Error('Database connection failed')) => mockDb({
  query: jest.fn().mockRejectedValue(error),
  healthCheck: jest.fn().mockResolvedValue(false),
});

/**
 * Reseta todos os mocks de db para comportamento padrão
 * @param {Object} dbMock - Módulo db mockado
 */
export const resetDbMocks = (dbMock) => {
  dbMock.query?.mockClear();
  dbMock.query?.mockResolvedValue({ rows: [], rowCount: 0 });
};