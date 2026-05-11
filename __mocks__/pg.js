/**
 * @fileoverview Mock Manual Compartilhado para a biblioteca 'pg'.
 *
 * Este arquivo é automaticamente utilizado pelo Jest sempre que `jest.mock('pg')`
 * é chamado em qualquer arquivo de teste. Ele centraliza a lógica de simulação
 * do Pool de conexões do PostgreSQL, evitando duplicação de código.
 *
 * ⚠️ `mockQuery` é um singleton compartilhado entre Pool.query e connect().query.
 * Isso garante que `mockResolvedValue`/`mockImplementation` configurados
 * nos testes funcionem em qualquer query executada via Pool.
 *
 * ⚠️ Uso com clearMocks:
 * Como `jest.config.js` usa `clearMocks: true` (limpa chamadas, não implementações),
 * NÃO é mais necessário chamar `restorePoolImplementation()` nos beforeEach
 * a menos que a implementação do Pool tenha sido sobrescrita manualmente.
 * Testes que usam `jest.clearAllMocks()` ainda precisam de `restorePoolImplementation()`.
 */
import { jest } from '@jest/globals';

/**
 * `mockQuery` é um singleton `jest.fn()` compartilhado por todas as instâncias
 * do Pool. Com `clearMocks: true` no jest.config.js, apenas as chamadas
 * (`calls`) são limpas entre testes — a implementação configurada via
 * `mockResolvedValue`/`mockImplementation` é preservada.
 */
export const mockQuery = jest.fn();

// A implementação é extraída para uma função nomeada para que possa ser
// re-aplicada após jest.clearAllMocks() ou jest.resetAllMocks(), que
// apagam a implementação de qualquer jest.fn() — fazendo Pool retornar
// undefined e quebrar qualquer chamada a getPool().query.
function poolImplementation() {
  return {
    query: mockQuery,
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue({
      query: mockQuery,
      release: jest.fn(),
      on: jest.fn(),
    }),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  };
}

export const Pool = jest.fn(poolImplementation);

// Exporta função de restauração para uso nos beforeEach dos testes.
// Deve ser chamada sempre que jest.clearAllMocks() ou jest.resetAllMocks()
// forem usados, pois ambos apagam a implementação do Pool:
//
//   import { mockQuery, restorePoolImplementation } from 'pg';
//   beforeEach(() => {
//     jest.clearAllMocks();
//     restorePoolImplementation();  // ← restaura Pool antes do resetPool()
//     resetPool();
//     mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
//   });
export function restorePoolImplementation() {
  Pool.mockImplementation(poolImplementation);
}

/**
 * Helper para simular erro em queries.
 * Configura o `mockQuery` para rejeitar com o erro especificado.
 *
 * @param {Error} [error=new Error('Database error')] - Erro a ser lançado
 *
 * @example
 * import { simulateQueryError } from 'pg';
 * simulateQueryError(new Error('Timeout'));
 * await expect(query('SELECT 1')).rejects.toThrow('Timeout');
 */
export function simulateQueryError(error = new Error('Database error')) {
  mockQuery.mockRejectedValue(error);
}

/**
 * Helper para simular falha de conexão com o banco.
 * Configura `Pool` para que `connect()` rejeite com o erro especificado.
 *
 * @param {Error} [error=new Error('Connection failed')] - Erro de conexão
 *
 * @example
 * import { simulateConnectionError } from 'pg';
 * simulateConnectionError(new Error('ECONNREFUSED'));
 * await expect(connect()).rejects.toThrow('ECONNREFUSED');
 */
export function simulateConnectionError(error = new Error('Connection failed')) {
  Pool.mockImplementation(() => {
    return {
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      connect: jest.fn().mockRejectedValue(error),
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    };
  });
}

// Compatibilidade com `import pg from 'pg'` e `pg.__mockQuery`
export default { Pool, mockQuery };