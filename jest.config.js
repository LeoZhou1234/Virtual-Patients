export default {
  testEnvironment: 'node',
  transform: {},
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!jest.config.js',
    '!coverage/**'
  ]
};
