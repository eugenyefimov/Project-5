// Global setup for Jest tests
// This file runs once before all test suites

const { Pool } = require('pg');
const redis = require('redis');
const { execSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
  process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'project5_test';
  process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
  process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'password';
  process.env.REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';
  process.env.REDIS_PORT = process.env.TEST_REDIS_PORT || '6379';
  process.env.REDIS_PASSWORD = process.env.TEST_REDIS_PASSWORD || '';
  process.env.LOG_LEVEL = 'error';
  process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests

  try {
    // Setup test database if running integration tests
    if (process.env.RUN_INTEGRATION_TESTS === 'true') {
      await setupTestDatabase();
    }

    // Setup test Redis if running integration tests
    if (process.env.RUN_INTEGRATION_TESTS === 'true') {
      await setupTestRedis();
    }

    // Create test directories
    await createTestDirectories();

    console.log('✅ Test environment setup completed');
  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    throw error;
  }
};

/**
 * Setup test database
 */
async function setupTestDatabase() {
  console.log('📊 Setting up test database...');

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres' // Connect to default database first
  });

  try {
    // Check if test database exists
    const dbCheckResult = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [process.env.DB_NAME]
    );

    // Create test database if it doesn't exist
    if (dbCheckResult.rows.length === 0) {
      console.log(`Creating test database: ${process.env.DB_NAME}`);
      await pool.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
    }

    await pool.end();

    // Connect to test database and create tables
    const testPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Create test tables
    await createTestTables(testPool);
    await testPool.end();

    console.log('✅ Test database setup completed');
  } catch (error) {
    await pool.end();
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

/**
 * Create test database tables
 */
async function createTestTables(pool) {
  console.log('📋 Creating test tables...');

  // Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(50) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Refresh tokens table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Password reset tokens table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Email verification tokens table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User sessions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      session_id VARCHAR(255) UNIQUE NOT NULL,
      ip_address INET,
      user_agent TEXT,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Audit logs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100),
      resource_id VARCHAR(100),
      details JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');

  console.log('✅ Test tables created successfully');
}

/**
 * Setup test Redis
 */
async function setupTestRedis() {
  console.log('🔴 Setting up test Redis...');

  try {
    const client = redis.createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD || undefined,
      db: 15 // Use database 15 for tests
    });

    await client.connect();
    
    // Clear test database
    await client.flushDb();
    
    // Test Redis connection
    await client.set('test:connection', 'ok');
    const testValue = await client.get('test:connection');
    
    if (testValue !== 'ok') {
      throw new Error('Redis connection test failed');
    }
    
    await client.del('test:connection');
    await client.quit();
    
    console.log('✅ Test Redis setup completed');
  } catch (error) {
    console.error('❌ Test Redis setup failed:', error);
    // Don't throw error for Redis setup failure in case Redis is not available
    console.warn('⚠️  Continuing without Redis (some tests may be skipped)');
  }
}

/**
 * Create test directories
 */
async function createTestDirectories() {
  console.log('📁 Creating test directories...');

  const fs = require('fs').promises;
  const directories = [
    'test-results',
    'coverage',
    'logs/test',
    'uploads/test',
    'temp/test'
  ];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    }
  }

  console.log('✅ Test directories created');
}

/**
 * Check if Docker is available and services are running
 */
async function checkDockerServices() {
  console.log('🐳 Checking Docker services...');

  try {
    // Check if Docker is available
    execSync('docker --version', { stdio: 'ignore' });
    
    // Check if PostgreSQL container is running
    try {
      execSync('docker ps --filter "name=postgres" --filter "status=running" --quiet', { stdio: 'ignore' });
      console.log('✅ PostgreSQL container is running');
    } catch (error) {
      console.warn('⚠️  PostgreSQL container not found or not running');
    }
    
    // Check if Redis container is running
    try {
      execSync('docker ps --filter "name=redis" --filter "status=running" --quiet', { stdio: 'ignore' });
      console.log('✅ Redis container is running');
    } catch (error) {
      console.warn('⚠️  Redis container not found or not running');
    }
  } catch (error) {
    console.warn('⚠️  Docker not available or not running');
  }
}

/**
 * Setup test environment variables from .env.test file
 */
function loadTestEnvironment() {
  console.log('🔧 Loading test environment variables...');

  try {
    const dotenv = require('dotenv');
    const envPath = path.join(__dirname, '../../.env.test');
    
    // Load .env.test file if it exists
    dotenv.config({ path: envPath });
    
    console.log('✅ Test environment variables loaded');
  } catch (error) {
    console.warn('⚠️  .env.test file not found, using default values');
  }
}