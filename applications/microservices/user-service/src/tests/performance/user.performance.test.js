// Performance tests for User Service
// These tests measure response times, throughput, and resource usage

const request = require('supertest');
const app = require('../../server');
const {
  dbUtils,
  redisUtils,
  JWTUtils,
  HTTPUtils,
  TestDataGenerator,
  WaitUtils,
  cleanup,
  closeConnections
} = require('../testUtils');

// Performance test configuration
const PERFORMANCE_CONFIG = {
  CONCURRENT_USERS: parseInt(process.env.PERF_CONCURRENT_USERS) || 10,
  TEST_DURATION: parseInt(process.env.PERF_TEST_DURATION) || 30000, // 30 seconds
  RAMP_UP_TIME: parseInt(process.env.PERF_RAMP_UP_TIME) || 5000, // 5 seconds
  MAX_RESPONSE_TIME: parseInt(process.env.PERF_MAX_RESPONSE_TIME) || 1000, // 1 second
  MIN_THROUGHPUT: parseInt(process.env.PERF_MIN_THROUGHPUT) || 100, // requests per second
  MEMORY_THRESHOLD: parseInt(process.env.PERF_MEMORY_THRESHOLD) || 100 * 1024 * 1024 // 100MB
};

describe('User Service Performance Tests', () => {
  let server;
  let testUsers = [];
  let userTokens = [];
  let performanceMetrics = {
    requests: [],
    errors: [],
    memoryUsage: [],
    responseTimeStats: {
      min: Infinity,
      max: 0,
      total: 0,
      count: 0
    }
  };

  beforeAll(async () => {
    // Skip performance tests if not explicitly enabled
    if (process.env.RUN_PERFORMANCE_TESTS !== 'true') {
      console.log('⏭️ Skipping performance tests (set RUN_PERFORMANCE_TESTS=true to enable)');
      return;
    }

    console.log('🚀 Starting performance test setup...');
    
    // Start the server
    server = app.listen(0);
    
    // Initialize connections
    await dbUtils.init();
    await redisUtils.init();
    
    // Clean and prepare test data
    await cleanup();
    
    // Create test users for performance testing
    console.log(`📊 Creating ${PERFORMANCE_CONFIG.CONCURRENT_USERS} test users...`);
    for (let i = 0; i < PERFORMANCE_CONFIG.CONCURRENT_USERS; i++) {
      const user = await dbUtils.createTestUser({
        email: `perf-user-${i}@example.com`,
        password: 'PerfTestPassword123!',
        first_name: `PerfUser${i}`,
        last_name: 'Test'
      });
      
      const token = JWTUtils.createTestToken({
        id: user.id,
        email: user.email,
        role: user.role
      });
      
      testUsers.push(user);
      userTokens.push(token);
    }
    
    console.log('✅ Performance test setup completed');
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    if (process.env.RUN_PERFORMANCE_TESTS !== 'true') {
      return;
    }

    console.log('📊 Generating performance report...');
    generatePerformanceReport();
    
    // Close server and connections
    if (server) {
      server.close();
    }
    await closeConnections();
  });

  beforeEach(() => {
    if (process.env.RUN_PERFORMANCE_TESTS !== 'true') {
      pending('Performance tests disabled');
    }
  });

  describe('Load Testing', () => {
    test('Health check endpoint should handle concurrent requests', async () => {
      const startTime = Date.now();
      const requests = [];
      
      // Create concurrent requests
      for (let i = 0; i < PERFORMANCE_CONFIG.CONCURRENT_USERS; i++) {
        requests.push(
          measureRequest(() => 
            request(app)
              .get('/health')
              .expect(200)
          )
        );
      }
      
      const results = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Analyze results
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const throughput = (results.length / totalTime) * 1000; // requests per second
      
      console.log(`📈 Health Check Load Test Results:`);
      console.log(`   Concurrent Users: ${PERFORMANCE_CONFIG.CONCURRENT_USERS}`);
      console.log(`   Total Time: ${totalTime}ms`);
      console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Max Response Time: ${maxResponseTime}ms`);
      console.log(`   Throughput: ${throughput.toFixed(2)} req/s`);
      
      // Assertions
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_RESPONSE_TIME);
      expect(maxResponseTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_RESPONSE_TIME * 2);
      expect(throughput).toBeGreaterThan(PERFORMANCE_CONFIG.MIN_THROUGHPUT / 10); // More lenient for health checks
      
      // All requests should succeed
      const successfulRequests = results.filter(r => r.success);
      expect(successfulRequests.length).toBe(results.length);
    }, 30000);

    test('User profile endpoint should handle concurrent authenticated requests', async () => {
      const startTime = Date.now();
      const requests = [];
      
      // Create concurrent authenticated requests
      for (let i = 0; i < Math.min(PERFORMANCE_CONFIG.CONCURRENT_USERS, userTokens.length); i++) {
        requests.push(
          measureRequest(() => 
            request(app)
              .get('/api/v1/users/profile')
              .set(HTTPUtils.createTestHeaders(userTokens[i]))
              .expect(200)
          )
        );
      }
      
      const results = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Analyze results
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const throughput = (results.length / totalTime) * 1000;
      
      console.log(`📈 Profile Load Test Results:`);
      console.log(`   Concurrent Users: ${requests.length}`);
      console.log(`   Total Time: ${totalTime}ms`);
      console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Max Response Time: ${maxResponseTime}ms`);
      console.log(`   Throughput: ${throughput.toFixed(2)} req/s`);
      
      // Assertions
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_RESPONSE_TIME);
      expect(maxResponseTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_RESPONSE_TIME * 3);
      
      // All requests should succeed
      const successfulRequests = results.filter(r => r.success);
      expect(successfulRequests.length).toBe(results.length);
    }, 30000);

    test('User registration should handle concurrent requests', async () => {
      const startTime = Date.now();
      const requests = [];
      const concurrentUsers = Math.min(PERFORMANCE_CONFIG.CONCURRENT_USERS, 20); // Limit for registration
      
      // Create concurrent registration requests
      for (let i = 0; i < concurrentUsers; i++) {
        const userData = TestDataGenerator.generateUserData({
          email: `load-test-${Date.now()}-${i}@example.com`
        });
        
        requests.push(
          measureRequest(() => 
            request(app)
              .post('/api/v1/users/register')
              .send(userData)
              .expect(201)
          )
        );
      }
      
      const results = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Analyze results
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const throughput = (results.length / totalTime) * 1000;
      
      console.log(`📈 Registration Load Test Results:`);
      console.log(`   Concurrent Registrations: ${concurrentUsers}`);
      console.log(`   Total Time: ${totalTime}ms`);
      console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Max Response Time: ${maxResponseTime}ms`);
      console.log(`   Throughput: ${throughput.toFixed(2)} req/s`);
      
      // Assertions (more lenient for registration due to password hashing)
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_RESPONSE_TIME * 3);
      expect(maxResponseTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_RESPONSE_TIME * 5);
      
      // All requests should succeed
      const successfulRequests = results.filter(r => r.success);
      expect(successfulRequests.length).toBe(results.length);
    }, 60000);
  });

  describe('Stress Testing', () => {
    test('Should handle sustained load over time', async () => {
      const testDuration = Math.min(PERFORMANCE_CONFIG.TEST_DURATION, 15000); // Max 15 seconds for CI
      const requestInterval = 100; // Request every 100ms
      const expectedRequests = Math.floor(testDuration / requestInterval);
      
      console.log(`🔥 Starting stress test for ${testDuration}ms...`);
      
      const startTime = Date.now();
      const results = [];
      let requestCount = 0;
      
      // Start memory monitoring
      const memoryMonitor = setInterval(() => {
        const memUsage = process.memoryUsage();
        performanceMetrics.memoryUsage.push({
          timestamp: Date.now(),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss
        });
      }, 1000);
      
      // Send requests at regular intervals
      const requestTimer = setInterval(async () => {
        if (Date.now() - startTime >= testDuration) {
          clearInterval(requestTimer);
          clearInterval(memoryMonitor);
          return;
        }
        
        const userIndex = requestCount % userTokens.length;
        const token = userTokens[userIndex];
        
        try {
          const result = await measureRequest(() => 
            request(app)
              .get('/api/v1/users/profile')
              .set(HTTPUtils.createTestHeaders(token))
          );
          
          results.push(result);
          updatePerformanceStats(result);
        } catch (error) {
          performanceMetrics.errors.push({
            timestamp: Date.now(),
            error: error.message
          });
        }
        
        requestCount++;
      }, requestInterval);
      
      // Wait for test completion
      await new Promise(resolve => {
        const checkCompletion = setInterval(() => {
          if (Date.now() - startTime >= testDuration) {
            clearInterval(checkCompletion);
            resolve();
          }
        }, 100);
      });
      
      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      
      // Analyze results
      const successfulRequests = results.filter(r => r.success);
      const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
      const throughput = (successfulRequests.length / actualDuration) * 1000;
      const errorRate = (results.length - successfulRequests.length) / results.length * 100;
      
      // Memory analysis
      const maxMemory = Math.max(...performanceMetrics.memoryUsage.map(m => m.heapUsed));
      const avgMemory = performanceMetrics.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / performanceMetrics.memoryUsage.length;
      
      console.log(`🔥 Stress Test Results:`);
      console.log(`   Duration: ${actualDuration}ms`);
      console.log(`   Total Requests: ${results.length}`);
      console.log(`   Successful Requests: ${successfulRequests.length}`);
      console.log(`   Error Rate: ${errorRate.toFixed(2)}%`);
      console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${throughput.toFixed(2)} req/s`);
      console.log(`   Max Memory Usage: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Avg Memory Usage: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
      
      // Assertions
      expect(errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_RESPONSE_TIME * 2);
      expect(maxMemory).toBeLessThan(PERFORMANCE_CONFIG.MEMORY_THRESHOLD);
      expect(successfulRequests.length).toBeGreaterThan(expectedRequests * 0.8); // At least 80% of expected requests
    }, 30000);
  });

  describe('Memory Leak Detection', () => {
    test('Should not have significant memory leaks during sustained operation', async () => {
      const testDuration = 10000; // 10 seconds
      const requestInterval = 50; // Request every 50ms
      
      console.log('🔍 Starting memory leak detection test...');
      
      const memorySnapshots = [];
      const startTime = Date.now();
      
      // Take initial memory snapshot
      global.gc && global.gc(); // Force garbage collection if available
      await WaitUtils.wait(100);
      memorySnapshots.push({
        timestamp: Date.now(),
        memory: process.memoryUsage().heapUsed
      });
      
      // Run sustained load
      const requestPromises = [];
      let requestCount = 0;
      
      const requestTimer = setInterval(async () => {
        if (Date.now() - startTime >= testDuration) {
          clearInterval(requestTimer);
          return;
        }
        
        const userIndex = requestCount % userTokens.length;
        const token = userTokens[userIndex];
        
        requestPromises.push(
          request(app)
            .get('/health')
            .set(HTTPUtils.createTestHeaders(token))
            .catch(() => {}) // Ignore errors for this test
        );
        
        requestCount++;
        
        // Take memory snapshot every 2 seconds
        if (requestCount % 40 === 0) {
          global.gc && global.gc();
          await WaitUtils.wait(100);
          memorySnapshots.push({
            timestamp: Date.now(),
            memory: process.memoryUsage().heapUsed
          });
        }
      }, requestInterval);
      
      // Wait for test completion
      await new Promise(resolve => {
        const checkCompletion = setInterval(() => {
          if (Date.now() - startTime >= testDuration) {
            clearInterval(checkCompletion);
            resolve();
          }
        }, 100);
      });
      
      // Wait for all requests to complete
      await Promise.all(requestPromises);
      
      // Take final memory snapshot
      global.gc && global.gc();
      await WaitUtils.wait(100);
      memorySnapshots.push({
        timestamp: Date.now(),
        memory: process.memoryUsage().heapUsed
      });
      
      // Analyze memory usage
      const initialMemory = memorySnapshots[0].memory;
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].memory;
      const maxMemory = Math.max(...memorySnapshots.map(s => s.memory));
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      console.log(`🔍 Memory Leak Detection Results:`);
      console.log(`   Initial Memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Final Memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Max Memory: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(2)}%)`);
      console.log(`   Total Requests: ${requestCount}`);
      
      // Assertions
      expect(memoryIncreasePercent).toBeLessThan(50); // Less than 50% memory increase
      expect(maxMemory).toBeLessThan(PERFORMANCE_CONFIG.MEMORY_THRESHOLD);
    }, 20000);
  });

  // Helper functions
  async function measureRequest(requestFn) {
    const startTime = Date.now();
    let success = false;
    let error = null;
    
    try {
      await requestFn();
      success = true;
    } catch (err) {
      error = err.message;
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      responseTime,
      success,
      error,
      timestamp: startTime
    };
  }
  
  function updatePerformanceStats(result) {
    performanceMetrics.requests.push(result);
    
    if (result.success) {
      performanceMetrics.responseTimeStats.min = Math.min(
        performanceMetrics.responseTimeStats.min,
        result.responseTime
      );
      performanceMetrics.responseTimeStats.max = Math.max(
        performanceMetrics.responseTimeStats.max,
        result.responseTime
      );
      performanceMetrics.responseTimeStats.total += result.responseTime;
      performanceMetrics.responseTimeStats.count++;
    } else {
      performanceMetrics.errors.push({
        timestamp: result.timestamp,
        error: result.error
      });
    }
  }
  
  function generatePerformanceReport() {
    const report = {
      summary: {
        totalRequests: performanceMetrics.requests.length,
        successfulRequests: performanceMetrics.requests.filter(r => r.success).length,
        errorRate: (performanceMetrics.errors.length / performanceMetrics.requests.length * 100).toFixed(2),
        avgResponseTime: (performanceMetrics.responseTimeStats.total / performanceMetrics.responseTimeStats.count).toFixed(2),
        minResponseTime: performanceMetrics.responseTimeStats.min,
        maxResponseTime: performanceMetrics.responseTimeStats.max
      },
      memory: {
        maxHeapUsed: Math.max(...performanceMetrics.memoryUsage.map(m => m.heapUsed)),
        avgHeapUsed: (performanceMetrics.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / performanceMetrics.memoryUsage.length),
        samples: performanceMetrics.memoryUsage.length
      },
      errors: performanceMetrics.errors,
      configuration: PERFORMANCE_CONFIG
    };
    
    console.log('\n📊 Performance Test Report:');
    console.log('================================');
    console.log(JSON.stringify(report, null, 2));
    console.log('================================\n');
    
    // Save report to file if in CI environment
    if (process.env.CI) {
      const fs = require('fs');
      const path = require('path');
      
      try {
        const reportPath = path.join('test-results', 'performance-report.json');
        fs.mkdirSync('test-results', { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Performance report saved to: ${reportPath}`);
      } catch (error) {
        console.error('Failed to save performance report:', error);
      }
    }
  }
});