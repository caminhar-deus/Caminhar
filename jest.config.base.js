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
};