/**
 * Jest Configuration - Test Suite Architecture
 * 
 * Configuração atualizada para usar a arquitetura de testes centralizada.
 * 
 * @see tests/README.md para documentação completa
 */

export default {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/*.test.js'
  ],
  
  // Configure Jest to handle ES modules and JSX with Babel
  transform: {
    '^.+\.(js|jsx|mjs|cjs)$': ['babel-jest', { configFile: './babel.jest.config.js' }]
  },
  
  transformIgnorePatterns: [
    '/node_modules/(?!node-mocks-http|@faker-js|url|pg)',
    '/node_modules/(?!@faker-js/)'  // Permite transformar @faker-js
  ],
  
  // Setup centralizado da arquitetura de testes
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  globalTeardown: '<rootDir>/jest.teardown.js',
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\.css$': '<rootDir>/__mocks__/styleMock.js',
    // Mapeamento para a arquitetura de testes
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@factories/(.*)$': '<rootDir>/tests/factories/$1',
    '^@helpers/(.*)$': '<rootDir>/tests/helpers/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@matchers/(.*)$': '<rootDir>/tests/matchers/$1',
    // Mock da biblioteca cookie
    '^cookie$': '<rootDir>/__mocks__/cookie.js'
  },
  
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  
  // Ensure proper module resolution
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
  
  // Force single worker for better ES module handling
  maxWorkers: 1,
  
  // Enable verbose output for debugging
  verbose: true,
  
  // Coverage configuration
  collectCoverageFrom: [
    'lib/**/*.js',
    'pages/api/**/*.js',
    'components/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test timeout
  testTimeout: 10000
};
