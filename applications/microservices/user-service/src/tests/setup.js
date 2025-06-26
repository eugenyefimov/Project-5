// Test setup file for User Service
// This file is executed before each test file

const { Pool } = require('pg');
const redis = require('redis');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'project5_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.LOG_LEVEL = 'error';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '5';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test utilities
global.testUtils = {
  // Helper to create test user data
  createTestUser: (overrides = {}) => ({
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    ...overrides
  }),

  // Helper to create test admin user data
  createTestAdmin: (overrides = {}) => ({
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    ...overrides
  }),

  // Helper to create JWT token for testing
  createTestToken: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        userId: 1,
        email: 'test@example.com',
        role: 'user',
        ...payload
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  // Helper to create expired JWT token for testing
  createExpiredToken: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        userId: 1,
        email: 'test@example.com',
        role: 'user',
        ...payload
      },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );
  },

  // Helper to wait for a specified time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to generate random email
  randomEmail: () => `test${Date.now()}${Math.random().toString(36).substr(2, 9)}@example.com`,

  // Helper to generate random string
  randomString: (length = 10) => Math.random().toString(36).substr(2, length),

  // Helper to create mock database response
  mockDbResponse: (rows = [], rowCount = null) => ({
    rows,
    rowCount: rowCount !== null ? rowCount : rows.length,
    command: 'SELECT',
    oid: null,
    fields: []
  }),

  // Helper to create mock Redis response
  mockRedisResponse: (value = 'OK') => Promise.resolve(value),

  // Helper to validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Helper to validate password strength
  isStrongPassword: (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
  }
};

// Global test matchers
expect.extend({
  // Custom matcher to check if response has error structure
  toHaveErrorStructure(received) {
    const pass = received && 
                 typeof received.success === 'boolean' && 
                 !received.success &&
                 typeof received.message === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have error structure`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have error structure with success: false and message`,
        pass: false
      };
    }
  },

  // Custom matcher to check if response has success structure
  toHaveSuccessStructure(received) {
    const pass = received && 
                 typeof received.success === 'boolean' && 
                 received.success;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have success structure`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have success structure with success: true`,
        pass: false
      };
    }
  },

  // Custom matcher to check if JWT token is valid
  toBeValidJWT(received) {
    try {
      const jwt = require('jsonwebtoken');
      jwt.verify(received, process.env.JWT_SECRET);
      return {
        message: () => `expected ${received} not to be a valid JWT`,
        pass: true
      };
    } catch (error) {
      return {
        message: () => `expected ${received} to be a valid JWT, but got error: ${error.message}`,
        pass: false
      };
    }
  }
});

// Setup global error handlers for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Increase timeout for async operations in tests
jest.setTimeout(30000);

// Mock external dependencies by default
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }))
}));

// Mock AWS SDK if used
jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Location: 'https://test-bucket.s3.amazonaws.com/test-file' })
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  })),
  config: {
    update: jest.fn()
  }
}));

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn(() => true)
}));

// Setup test database connection mock
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
};

// Setup test Redis connection mock
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  connect: jest.fn(),
  quit: jest.fn(),
  on: jest.fn()
};

// Export mocks for use in tests
global.mockPool = mockPool;
global.mockRedisClient = mockRedisClient;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});