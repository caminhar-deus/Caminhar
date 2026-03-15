/**
 * Jest Configuration - Test Suite Architecture
 * * Configuração otimizada:
 * - Babel lida com ES Modules e JSX.
 * - V8 lida com a cobertura (evita erros de TypeError).
 * - Cobertura desativada por padrão para acelerar o 'npm test'.
 */

export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.js'],
  
  // Usar o provedor V8 evita conflitos com o plugin Istanbul do Babel
  coverageProvider: 'v8',

  // Mantém o processamento de ES Modules e JSX via Babel
  transform: {
    '^.+\\.(js|jsx|mjs|cjs)$': ['babel-jest', { configFile: './babel.jest.config.js' }]
  },
  
  // CONFIGURAÇÃO DE COBERTURA (Ativada apenas via CLI --coverage)
  collectCoverage: false, 
  collectCoverageFrom: [
    'lib/**/*.js',
    'pages/api/**/*.js',
    'components/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/lib/db.js',   // Módulos excluídos por precaução
    '!**/lib/auth.js'  
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  transformIgnorePatterns: [
    '/node_modules/(?!node-mocks-http|@faker-js|url|pg)',
    '/node_modules/(?!@faker-js/)'
  ],
  
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globalTeardown: '<rootDir>/jest.teardown.js',
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@factories/(.*)$': '<rootDir>/tests/factories/$1',
    '^@helpers/(.*)$': '<rootDir>/tests/helpers/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@matchers/(.*)$': '<rootDir>/tests/matchers/$1',
  },
  
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  cache: true,
  maxWorkers: 1, // Mantido 1 para melhor estabilidade com módulos ESM
  verbose: true,
  testTimeout: 10000
};