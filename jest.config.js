/**
 * Jest Configuration - Test Suite Architecture
 * * Configuração otimizada:
 * - Babel lida com ES Modules e JSX.
 * - V8 lida com a cobertura (evita erros de TypeError).
 * - Cobertura desativada por padrão para acelerar o 'npm test'.
 * 
 * Estende jest.config.base.js com propriedades específicas
 * para testes com ambiente jsdom e cobertura.
 */
import baseConfig from './jest.config.base.js';

export default {
  ...baseConfig,

  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.js'],
  
  // Usar o provedor V8 evita conflitos com o plugin Istanbul do Babel
  coverageProvider: 'v8',

  // Mantém o processamento de ES Modules e JSX via Babel
  // (transform herdado de baseConfig)

  // CONFIGURAÇÃO DE COBERTURA (Ativada apenas via CLI --coverage)
  collectCoverage: false, 
  collectCoverageFrom: [
    'lib/**/*.js',
    'pages/api/**/*.js',
    'components/**/*.js',
    'hooks/**/*.js',
    'utils/**/*.js',
    '!utils/empty-browser-module.js',
    '!**/*.test.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // ✅ Threshold mínimo de cobertura com buffer de segurança
  // 'global' vale para o conjunto de todos os arquivos coletados.
  // Cada grupo por diretório (chave terminando em '/') vale para a cobertura
  // AGREGADA dos arquivos daquele diretório, impedindo que uma regressão
  // concentrada em um módulo crítico passe despercebida na média global.
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    },
    'lib/domain/': {
      branches: 82,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'pages/api/admin/': {
      branches: 82,
      functions: 95,
      lines: 90,
      statements: 90
    },
    'pages/api/auth/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'pages/api/customer/': {
      branches: 85,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'lib/payment/': {
      branches: 80,
      functions: 95,
      lines: 90,
      statements: 90
    },
    'components/Admin/': {
      branches: 82,
      functions: 85,
      lines: 90,
      statements: 90
    },
    'components/Admin/fields/': {
      branches: 88,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'lib/infra/': {
      branches: 65,
      functions: 80,
      lines: 75,
      statements: 75
    },
    'hooks/': {
      branches: 72,
      functions: 75,
      lines: 80,
      statements: 80
    },
    'utils/': {
      branches: 75,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Lista de pacotes ESM que precisam ser transformados pelo Babel.
  // Manter atualizada sempre que uma nova dependência ESM pura for adicionada.
  transformIgnorePatterns: [
    '/node_modules/(?!node-mocks-http|@faker-js|url|pg|@upstash/redis|uncrypto)'
  ],
  
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globalTeardown: '<rootDir>/jest.teardown.js',
  
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  
  cache: true,
  testTimeout: 10000
};