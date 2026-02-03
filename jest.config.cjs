const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Forneça o caminho para seu aplicativo Next.js para carregar next.config.js e arquivos .env
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)