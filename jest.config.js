export default {
  testEnvironment: 'node',
  testMatch: [
    '**/*.test.js'
  ],
  // Configure Jest to handle ES modules and JSX with Babel
  transform: {
    '^.+\\.(js|jsx|mjs)$': ['babel-jest', { configFile: './babel.jest.config.js' }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!node-mocks-http/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globalTeardown: '<rootDir>/jest.teardown.js',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node']
};
