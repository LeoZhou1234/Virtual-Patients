export default {
  testEnvironment: 'node',
  transform: {},
  coveragePathIgnorePatterns: ['/node_modules/'],
  testPathIgnorePatterns: ['/tests/pages.test.js'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!jest.config.js',
    '!coverage/**'
  ]
};
