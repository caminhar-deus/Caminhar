export default {
  testEnvironment: 'node',
  testMatch: [
    '**/*.test.js'
  ],
  // Configure Jest to handle ES modules and JSX with Babel
  transform: {
    '^.+\\.jsx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!node-mocks-http/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globalTeardown: '<rootDir>/jest.teardown.cjs',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1'
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};
