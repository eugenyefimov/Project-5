// Global teardown for Jest tests
// This file runs once after all test suites

const { Pool } = require('pg');
const redis = require('redis');
const fs = require('fs').promises;
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Cleanup test database if integration tests were run
    if (process.env.RUN_INTEGRATION_TESTS === 'true') {
      await cleanupTestDatabase();
    }

    // Cleanup test Redis if integration tests were run
    if (process.env.RUN_INTEGRATION_TESTS === 'true') {
      await cleanupTestRedis();
    }

    // Cleanup test files and directories
    await cleanupTestFiles();

    // Generate test summary
    await generateTestSummary();

    console.log('✅ Test environment cleanup completed');
  } catch (error) {
    console.error('❌ Test environment cleanup failed:', error);
    // Don't throw error to avoid masking test failures
  }
};

/**
 * Cleanup test database
 */
async function cleanupTestDatabase() {
  console.log('🗄️ Cleaning up test database...');

  // Only cleanup if explicitly requested (to preserve data for debugging)
  if (process.env.CLEANUP_TEST_DB !== 'true') {
    console.log('⏭️ Skipping database cleanup (set CLEANUP_TEST_DB=true to enable)');
    return;
  }

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Clear all test data
    await pool.query('TRUNCATE TABLE audit_logs CASCADE');
    await pool.query('TRUNCATE TABLE user_sessions CASCADE');
    await pool.query('TRUNCATE TABLE email_verification_tokens CASCADE');
    await pool.query('TRUNCATE TABLE password_reset_tokens CASCADE');
    await pool.query('TRUNCATE TABLE refresh_tokens CASCADE');
    await pool.query('TRUNCATE TABLE users CASCADE');

    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
  } finally {
    await pool.end();
  }
}

/**
 * Cleanup test Redis
 */
async function cleanupTestRedis() {
  console.log('🔴 Cleaning up test Redis...');

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
    
    await client.quit();
    
    console.log('✅ Test Redis cleaned up');
  } catch (error) {
    console.error('❌ Test Redis cleanup failed:', error);
    // Don't throw error for Redis cleanup failure
  }
}

/**
 * Cleanup test files and directories
 */
async function cleanupTestFiles() {
  console.log('📁 Cleaning up test files...');

  try {
    // Clean up temporary test files
    const tempDirs = [
      'temp/test',
      'uploads/test'
    ];

    for (const dir of tempDirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.startsWith('test-') || file.includes('temp')) {
            await fs.unlink(path.join(dir, file));
          }
        }
      } catch (error) {
        // Directory might not exist, ignore
      }
    }

    // Clean up old log files (keep last 5)
    try {
      const logDir = 'logs/test';
      const logFiles = await fs.readdir(logDir);
      const sortedLogs = logFiles
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          stat: null
        }));

      // Get file stats for sorting by creation time
      for (const log of sortedLogs) {
        try {
          log.stat = await fs.stat(log.path);
        } catch (error) {
          // File might have been deleted, ignore
        }
      }

      // Sort by creation time (newest first) and keep only last 5
      const logsToDelete = sortedLogs
        .filter(log => log.stat)
        .sort((a, b) => b.stat.ctime - a.stat.ctime)
        .slice(5);

      for (const log of logsToDelete) {
        await fs.unlink(log.path);
      }

      if (logsToDelete.length > 0) {
        console.log(`🗑️ Cleaned up ${logsToDelete.length} old log files`);
      }
    } catch (error) {
      // Log directory might not exist, ignore
    }

    console.log('✅ Test files cleaned up');
  } catch (error) {
    console.error('❌ Test files cleanup failed:', error);
  }
}

/**
 * Generate test summary
 */
async function generateTestSummary() {
  console.log('📊 Generating test summary...');

  try {
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        nodeEnv: process.env.NODE_ENV
      },
      testConfiguration: {
        jestVersion: getJestVersion(),
        testTimeout: process.env.JEST_TIMEOUT || 'default',
        runIntegrationTests: process.env.RUN_INTEGRATION_TESTS === 'true',
        cleanupTestDb: process.env.CLEANUP_TEST_DB === 'true'
      },
      database: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        name: process.env.DB_NAME,
        connected: await testDatabaseConnection()
      },
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        connected: await testRedisConnection()
      },
      coverage: {
        enabled: process.env.COLLECT_COVERAGE === 'true',
        threshold: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    };

    // Write summary to file
    const summaryPath = path.join('test-results', 'test-summary.json');
    await fs.mkdir('test-results', { recursive: true });
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`✅ Test summary generated: ${summaryPath}`);
  } catch (error) {
    console.error('❌ Test summary generation failed:', error);
  }
}

/**
 * Get Jest version
 */
function getJestVersion() {
  try {
    const packageJson = require('../../package.json');
    return packageJson.devDependencies?.jest || packageJson.dependencies?.jest || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Test database connection
 */
async function testDatabaseConnection() {
  if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
    return 'skipped';
  }

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await pool.query('SELECT 1');
    return 'connected';
  } catch (error) {
    return 'failed';
  } finally {
    await pool.end();
  }
}

/**
 * Test Redis connection
 */
async function testRedisConnection() {
  if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
    return 'skipped';
  }

  try {
    const client = redis.createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD || undefined,
      db: 15
    });

    await client.connect();
    await client.ping();
    await client.quit();
    
    return 'connected';
  } catch (error) {
    return 'failed';
  }
}

/**
 * Log final test statistics
 */
function logTestStatistics() {
  console.log('\n📈 Test Run Statistics:');
  console.log('========================');
  console.log(`Start Time: ${process.env.TEST_START_TIME || 'Unknown'}`);
  console.log(`End Time: ${new Date().toISOString()}`);
  
  if (process.env.TEST_START_TIME) {
    const startTime = new Date(process.env.TEST_START_TIME);
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    console.log(`Duration: ${duration}s`);
  }
  
  console.log(`Node Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log('========================\n');
}

// Log statistics before cleanup
logTestStatistics();