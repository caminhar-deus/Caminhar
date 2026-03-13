/**
 * @fileoverview Mock Manual Compartilhado para a biblioteca 'pg'.
 * 
 * Este arquivo é automaticamente utilizado pelo Jest sempre que `jest.mock('pg')`
 * é chamado em qualquer arquivo de teste. Ele centraliza a lógica de simulação
 * do Pool de conexões do PostgreSQL, evitando duplicação de código.
 */
import { jest } from '@jest/globals';

export const mockQuery = jest.fn();

const mockPool = {
  query: mockQuery,
  end: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
};

export const Pool = jest.fn(() => mockPool);

// Adiciona uma exportação padrão para compatibilidade com importações como `import pg from 'pg';`
export default {
  Pool: Pool,
};