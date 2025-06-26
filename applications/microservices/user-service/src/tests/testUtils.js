// Test utilities and helper functions
// This file provides common utilities for testing the user service

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const redis = require('redis');
const crypto = require('crypto');

/**
 * Database utilities
 */
class DatabaseUtils {
  constructor() {
    this.pool = null;
  }

  /**
   * Initialize database connection
   */
  async init() {
    if (!this.pool) {
      this.pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      });
    }
    return this.pool;
  }

  /**
   * Clean all test data from database
   */
  async cleanDatabase() {
    await this.init();
    
    const tables = [
      'audit_logs',
      'user_sessions',
      'email_verification_tokens',
      'password_reset_tokens',
      'refresh_tokens',
      'users'
    ];

    for (const table of tables) {
      await this.pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }
  }

  /**
   * Create a test user in database
   */
  async createTestUser(userData = {}) {
    await this.init();
    
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      is_active: true,
      email_verified: true
    };

    const user = { ...defaultUser, ...userData };
    const passwordHash = await bcrypt.hash(user.password, 4);

    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, role, is_active, email_verified, created_at, updated_at`,
      [user.email, passwordHash, user.first_name, user.last_name, user.role, user.is_active, user.email_verified]
    );

    return {
      ...result.rows[0],
      password: user.password // Return plain password for testing
    };
  }

  /**
   * Create multiple test users
   */
  async createTestUsers(count = 5) {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser({
        email: `test-user-${i}-${Date.now()}@example.com`,
        first_name: `Test${i}`,
        last_name: `User${i}`
      });
      users.push(user);
    }
    return users;
  }

  /**
   * Create admin test user
   */
  async createAdminUser(userData = {}) {
    return this.createTestUser({
      email: `admin-${Date.now()}@example.com`,
      role: 'admin',
      ...userData
    });
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    await this.init();
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    await this.init();
    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Create refresh token for user
   */
  async createRefreshToken(userId) {
    await this.init();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    return token;
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

/**
 * Redis utilities
 */
class RedisUtils {
  constructor() {
    this.client = null;
  }

  /**
   * Initialize Redis connection
   */
  async init() {
    if (!this.client) {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD || undefined,
        db: 15 // Test database
      });
      await this.client.connect();
    }
    return this.client;
  }

  /**
   * Clear all Redis data
   */
  async clearRedis() {
    await this.init();
    await this.client.flushDb();
  }

  /**
   * Set test data in Redis
   */
  async setTestData(key, value, ttl = 3600) {
    await this.init();
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    await this.client.setEx(key, ttl, value);
  }

  /**
   * Get test data from Redis
   */
  async getTestData(key) {
    await this.init();
    const value = await this.client.get(key);
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

/**
 * JWT utilities
 */
class JWTUtils {
  /**
   * Create test JWT token
   */
  static createTestToken(payload = {}, options = {}) {
    const defaultPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'user'
    };

    const defaultOptions = {
      expiresIn: '1h',
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    };

    return jwt.sign(
      { ...defaultPayload, ...payload },
      process.env.JWT_SECRET,
      { ...defaultOptions, ...options }
    );
  }

  /**
   * Create expired JWT token
   */
  static createExpiredToken(payload = {}) {
    return this.createTestToken(payload, { expiresIn: '-1h' });
  }

  /**
   * Create invalid JWT token
   */
  static createInvalidToken() {
    return 'invalid.jwt.token';
  }

  /**
   * Create refresh token
   */
  static createRefreshToken(payload = {}, options = {}) {
    const defaultPayload = {
      id: 1,
      type: 'refresh'
    };

    const defaultOptions = {
      expiresIn: '7d'
    };

    return jwt.sign(
      { ...defaultPayload, ...payload },
      process.env.JWT_REFRESH_SECRET,
      { ...defaultOptions, ...options }
    );
  }

  /**
   * Verify test token
   */
  static verifyTestToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

/**
 * HTTP utilities
 */
class HTTPUtils {
  /**
   * Create authorization header
   */
  static createAuthHeader(token) {
    return `Bearer ${token}`;
  }

  /**
   * Create test request headers
   */
  static createTestHeaders(token = null, additionalHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Test-Agent/1.0',
      'X-Forwarded-For': '127.0.0.1',
      ...additionalHeaders
    };

    if (token) {
      headers.Authorization = this.createAuthHeader(token);
    }

    return headers;
  }

  /**
   * Create multipart form headers
   */
  static createMultipartHeaders(token = null) {
    const headers = {
      'User-Agent': 'Test-Agent/1.0',
      'X-Forwarded-For': '127.0.0.1'
    };

    if (token) {
      headers.Authorization = this.createAuthHeader(token);
    }

    return headers;
  }
}

/**
 * Mock utilities
 */
class MockUtils {
  /**
   * Mock console methods
   */
  static mockConsole() {
    const originalConsole = { ...console };
    
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();

    return originalConsole;
  }

  /**
   * Restore console methods
   */
  static restoreConsole(originalConsole) {
    Object.assign(console, originalConsole);
  }

  /**
   * Mock Date.now
   */
  static mockDateNow(timestamp) {
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => timestamp);
    return originalDateNow;
  }

  /**
   * Restore Date.now
   */
  static restoreDateNow(originalDateNow) {
    Date.now = originalDateNow;
  }

  /**
   * Mock process.env
   */
  static mockEnv(envVars) {
    const originalEnv = { ...process.env };
    Object.assign(process.env, envVars);
    return originalEnv;
  }

  /**
   * Restore process.env
   */
  static restoreEnv(originalEnv) {
    process.env = originalEnv;
  }
}

/**
 * Validation utilities
 */
class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Validate JWT token format
   */
  static isValidJWTFormat(token) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    return jwtRegex.test(token);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

/**
 * Test data generators
 */
class TestDataGenerator {
  /**
   * Generate random email
   */
  static generateEmail(domain = 'example.com') {
    const username = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return `${username}@${domain}`;
  }

  /**
   * Generate random password
   */
  static generatePassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
    let password = '';
    
    // Ensure at least one of each required character type
    password += 'A'; // uppercase
    password += 'a'; // lowercase
    password += '1'; // number
    password += '@'; // special char
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Generate random name
   */
  static generateName() {
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    
    return {
      first_name: firstNames[Math.floor(Math.random() * firstNames.length)],
      last_name: lastNames[Math.floor(Math.random() * lastNames.length)]
    };
  }

  /**
   * Generate test user data
   */
  static generateUserData(overrides = {}) {
    const name = this.generateName();
    return {
      email: this.generateEmail(),
      password: this.generatePassword(),
      ...name,
      role: 'user',
      is_active: true,
      email_verified: false,
      ...overrides
    };
  }
}

/**
 * Wait utilities
 */
class WaitUtils {
  /**
   * Wait for specified milliseconds
   */
  static async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for condition to be true
   */
  static async waitFor(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await this.wait(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
}

// Create singleton instances
const dbUtils = new DatabaseUtils();
const redisUtils = new RedisUtils();

// Export utilities
module.exports = {
  DatabaseUtils,
  RedisUtils,
  JWTUtils,
  HTTPUtils,
  MockUtils,
  ValidationUtils,
  TestDataGenerator,
  WaitUtils,
  
  // Singleton instances
  dbUtils,
  redisUtils,
  
  // Cleanup function for tests
  async cleanup() {
    try {
      await dbUtils.cleanDatabase();
      await redisUtils.clearRedis();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  },
  
  // Close all connections
  async closeConnections() {
    try {
      await dbUtils.close();
      await redisUtils.close();
    } catch (error) {
      console.error('Failed to close connections:', error);
    }
  }
};