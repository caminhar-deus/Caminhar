/**
 * Jest Configuration — Testes com PostgreSQL Real via Testcontainers.
 * 
 * Configuração dedicada para testes de integração com banco real.
 * Executa apenas arquivos *.db.test.js com ambiente node.
 * Estende jest.config.base.js com propriedades específicas para DB.
 * 
 * Para executar: npm run test:db:container
 */
import baseConfig from './jest.config.base.js';

export default {
  ...baseConfig,

  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/global-setup.db.js',
  testMatch: ['**/*.db.test.js'],
  testTimeout: 30000,
  collectCoverage: false,
  // Diretório próprio para não sobrescrever o relatório da suíte principal
  // (que usa 'coverage' e é consumido por análise de cobertura/CI).
  coverageDirectory: 'coverage-db',
  // Mede apenas as camadas exercitadas pelos testes com banco real,
  // evitando um relatório inflado por arquivos fora do alcance desta suíte.
  collectCoverageFrom: [
    'lib/domain/**/*.js',
    'lib/infra/**/*.js',
    '!**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.db.js'],
  globalTeardown: '<rootDir>/jest.teardown.js',
  transformIgnorePatterns: [
    '/node_modules/(?!/testcontainers|@testcontainers)/'
  ],
};