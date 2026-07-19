/**
 * Jest Configuration — Testes com PostgreSQL Real via Testcontainers.
 * 
 * Configuração dedicada para testes de integração com banco real.
 * Executa apenas arquivos *.db.test.js com ambiente node.
 * Inclui transform Babel para compatibilidade ESM.
 * 
 * Para executar: npm run test:db:container
 */
export default {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/global-setup.db.js',
  testMatch: ['**/*.db.test.js'],
  testTimeout: 30000,
  maxWorkers: '50%',
  collectCoverage: false,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  transform: {
    '^.+\\.(js|jsx|mjs|cjs)$': ['babel-jest', { configFile: './babel.jest.config.js' }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!/testcontainers|@testcontainers)/'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.db.js'],
  globalTeardown: '<rootDir>/jest.teardown.js',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@factories/(.*)$': '<rootDir>/tests/factories/$1',
    '^@helpers/(.*)$': '<rootDir>/tests/helpers/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@matchers/(.*)$': '<rootDir>/tests/matchers/$1',
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
};