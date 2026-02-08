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
    '^@/(.*)$': '<rootDir>/$1',
    '\\.css$': '<rootDir>/__mocks__/styleMock.js'
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  // Use CommonJS for mocks
  resolver: undefined,
  // Ensure proper module resolution
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
  // Force single worker for better ES module handling
  maxWorkers: 1,
  // Enable verbose output for debugging
  verbose: true
};
