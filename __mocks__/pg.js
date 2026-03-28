/**
 * @fileoverview Mock Manual Compartilhado para a biblioteca 'pg'.
 *
 * Este arquivo é automaticamente utilizado pelo Jest sempre que `jest.mock('pg')`
 * é chamado em qualquer arquivo de teste. Ele centraliza a lógica de simulação
 * do Pool de conexões do PostgreSQL, evitando duplicação de código.
 */
import { jest } from '@jest/globals';

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
    }),
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

// Compatibilidade com `import pg from 'pg'` e `pg.__mockQuery`
export default { Pool, mockQuery };