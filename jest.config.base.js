/**
 * Jest Configuration — Base Compartilhada
 * 
 * Propriedades comuns entre jest.config.js e jest.config.db.js.
 * Ambos os arquivos importam este base e sobrescrevem/estendem
 * conforme necessidade específica.
 */
export default {
  transform: {
    '^.+\\.(js|jsx|mjs|cjs)$': ['babel-jest', { configFile: './babel.jest.config.js' }]
  },

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@factories/(.*)$': '<rootDir>/tests/factories/$1',
    '^@helpers/(.*)$': '<rootDir>/tests/helpers/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@matchers/(.*)$': '<rootDir>/tests/matchers/$1',
  },

  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],

  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  maxWorkers: '50%',

  // O default do Jest (500 ms) é curto para esta máquina: o worker termina os
  // testes, mas sob carga pode levar mais que isso para drenar a saída e o
  // Jest o marca como `forceExited`, imprimindo "A worker process has failed
  // to exit gracefully" mesmo sem timer vazado no projeto (medido em
  // 07/11/2026: nenhum handle do projeto com `hasRef()` no force-exit).
  // 5 s dão folga para a saída normal e mantêm o aviso como rede de segurança
  // para um vazamento real, que não drenaria nem nesse prazo.
  workerGracefulExitTimeout: 5000,
};