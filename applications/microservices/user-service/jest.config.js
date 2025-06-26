module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/src/tests/**/*.test.js',
    '**/src/**/__tests__/**/*.js',
    '**/src/**/*.test.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/**/__tests__/**',
    '!src/**/*.test.js',
    '!src/config/**',
    '!src/migrations/**',
    '!src/seeds/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup.js'
  ],

  // Module paths
  modulePaths: [
    '<rootDir>/src'
  ],

  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1'
  },

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Reset modules between tests
  resetModules: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Global setup and teardown
  globalSetup: '<rootDir>/src/tests/globalSetup.js',
  globalTeardown: '<rootDir>/src/tests/globalTeardown.js',

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(supertest)/)',
    '\\.pnp\\.[^\\]+$'
  ],

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'node'
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/'
  ],

  // Watch path ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
    '/logs/'
  ],

  // Notify mode
  notify: false,

  // Bail on first test failure
  bail: false,

  // Max workers
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',

  // Error on deprecated features
  errorOnDeprecated: true,

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        suiteName: 'User Service Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results',
        filename: 'report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'User Service Test Report'
      }
    ]
  ],

  // Environment variables
  setupFiles: [
    '<rootDir>/src/tests/env.js'
  ],

  // Mock configuration
  modulePathIgnorePatterns: [
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ],

  // Snapshot serializers
  snapshotSerializers: [],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Test results processor
  testResultsProcessor: undefined,

  // Custom resolver
  resolver: undefined,

  // Dependency extractor
  dependencyExtractor: undefined,

  // Test runner
  testRunner: 'jest-circus/runner',

  // Test sequencer
  testSequencer: '@jest/test-sequencer',

  // Preset
  preset: undefined,

  // Projects (for multi-project setup)
  projects: undefined,

  // Display name
  displayName: {
    name: 'User Service',
    color: 'blue'
  },

  // Globals
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'project5_test',
      DB_USER: 'test_user',
      DB_PASSWORD: 'test_password',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      LOG_LEVEL: 'error'
    }
  },

  // Extra options for specific environments
  testEnvironmentOptions: {
    url: 'http://localhost:3002'
  }
};