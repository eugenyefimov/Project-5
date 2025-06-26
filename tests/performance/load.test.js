// Performance and Load Testing for Project-5
// Tests application performance under various load conditions

const autocannon = require('autocannon');
const { performance } = require('perf_hooks');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

describe('Project-5 Performance Tests', () => {
  const baseUrl = process.env.PERF_BASE_URL || 'http://localhost:8000';
  const frontendUrl = process.env.PERF_FRONTEND_URL || 'http://localhost:3000';
  const resultsDir = path.join(__dirname, 'results');
  
  beforeAll(async () => {
    // Ensure results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Wait for services to be ready
    await waitForServices();
  });
  
  async function waitForServices() {
    const maxRetries = 30;
    const retryDelay = 2000;
    
    console.log('Waiting for services to be ready for performance testing...');
    
    // Wait for backend
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
        if (response.status === 200) {
          console.log('Backend is ready for performance testing');
          break;
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Backend not ready after ${maxRetries} retries`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // Wait for frontend
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(frontendUrl, { timeout: 5000 });
        if (response.status === 200) {
          console.log('Frontend is ready for performance testing');
          break;
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Frontend not ready after ${maxRetries} retries`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  function saveResults(testName, results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${testName}-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${filepath}`);
  }
  
  describe('API Performance Tests', () => {
    test('Health endpoint performance under light load', async () => {
      const result = await autocannon({
        url: `${baseUrl}/health`,
        connections: 10,
        duration: 30,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      saveResults('health-light-load', result);
      
      // Assertions
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.non2xx).toBe(0);
      expect(result.requests.average).toBeGreaterThan(100); // At least 100 req/sec
      expect(result.latency.p99).toBeLessThan(100); // 99th percentile under 100ms
      
      console.log(`Health endpoint - Avg RPS: ${result.requests.average}, P99 Latency: ${result.latency.p99}ms`);
    }, 60000);
    
    test('Health endpoint performance under moderate load', async () => {
      const result = await autocannon({
        url: `${baseUrl}/health`,
        connections: 50,
        duration: 60,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      saveResults('health-moderate-load', result);
      
      // Assertions
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.non2xx).toBe(0);
      expect(result.requests.average).toBeGreaterThan(50); // At least 50 req/sec under load
      expect(result.latency.p99).toBeLessThan(500); // 99th percentile under 500ms
      
      console.log(`Health endpoint (moderate) - Avg RPS: ${result.requests.average}, P99 Latency: ${result.latency.p99}ms`);
    }, 120000);
    
    test('Status endpoint performance', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/v1/status`,
        connections: 25,
        duration: 30,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      saveResults('status-endpoint', result);
      
      // Assertions
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.non2xx).toBe(0);
      expect(result.requests.average).toBeGreaterThan(75); // At least 75 req/sec
      expect(result.latency.p95).toBeLessThan(200); // 95th percentile under 200ms
      
      console.log(`Status endpoint - Avg RPS: ${result.requests.average}, P95 Latency: ${result.latency.p95}ms`);
    }, 60000);
    
    test('API response time consistency', async () => {
      const measurements = [];
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        try {
          const response = await axios.get(`${baseUrl}/health`);
          const end = performance.now();
          
          expect(response.status).toBe(200);
          measurements.push(end - start);
        } catch (error) {
          fail(`Request ${i + 1} failed: ${error.message}`);
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Calculate statistics
      const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const sorted = measurements.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      const max = Math.max(...measurements);
      const min = Math.min(...measurements);
      
      const stats = {
        iterations,
        average: avg,
        median: p50,
        p95,
        p99,
        max,
        min,
        measurements
      };
      
      saveResults('response-time-consistency', stats);
      
      // Assertions
      expect(avg).toBeLessThan(50); // Average under 50ms
      expect(p95).toBeLessThan(100); // 95th percentile under 100ms
      expect(p99).toBeLessThan(200); // 99th percentile under 200ms
      
      console.log(`Response time consistency - Avg: ${avg.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms, P99: ${p99.toFixed(2)}ms`);
    }, 30000);
  });
  
  describe('Frontend Performance Tests', () => {
    test('Frontend static asset loading performance', async () => {
      const measurements = [];
      const iterations = 20;
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        try {
          const response = await axios.get(frontendUrl, {
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          const end = performance.now();
          
          expect(response.status).toBe(200);
          expect(response.headers['content-type']).toContain('text/html');
          
          measurements.push({
            responseTime: end - start,
            contentLength: response.headers['content-length'] || response.data.length,
            iteration: i + 1
          });
        } catch (error) {
          fail(`Frontend request ${i + 1} failed: ${error.message}`);
        }
        
        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const avgResponseTime = measurements.reduce((sum, m) => sum + m.responseTime, 0) / measurements.length;
      const avgContentLength = measurements.reduce((sum, m) => sum + parseInt(m.contentLength || 0), 0) / measurements.length;
      
      const stats = {
        iterations,
        averageResponseTime: avgResponseTime,
        averageContentLength: avgContentLength,
        measurements
      };
      
      saveResults('frontend-static-assets', stats);
      
      // Assertions
      expect(avgResponseTime).toBeLessThan(1000); // Average under 1 second
      expect(avgContentLength).toBeGreaterThan(0); // Content is being served
      
      console.log(`Frontend loading - Avg response time: ${avgResponseTime.toFixed(2)}ms, Avg content length: ${avgContentLength} bytes`);
    }, 60000);
    
    test('Frontend concurrent user simulation', async () => {
      const result = await autocannon({
        url: frontendUrl,
        connections: 20,
        duration: 30,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PerformanceTest/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      saveResults('frontend-concurrent-users', result);
      
      // Assertions
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.non2xx).toBe(0);
      expect(result.requests.average).toBeGreaterThan(10); // At least 10 req/sec
      expect(result.latency.p99).toBeLessThan(2000); // 99th percentile under 2 seconds
      
      console.log(`Frontend concurrent users - Avg RPS: ${result.requests.average}, P99 Latency: ${result.latency.p99}ms`);
    }, 60000);
  });
  
  describe('Memory and Resource Usage', () => {
    test('Memory usage during sustained load', async () => {
      const memoryMeasurements = [];
      const duration = 60000; // 1 minute
      const interval = 5000; // 5 seconds
      
      // Start background load
      const loadPromise = autocannon({
        url: `${baseUrl}/health`,
        connections: 10,
        duration: duration / 1000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Monitor memory usage
      const startTime = Date.now();
      const memoryInterval = setInterval(() => {
        const memUsage = process.memoryUsage();
        memoryMeasurements.push({
          timestamp: Date.now() - startTime,
          rss: memUsage.rss,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external
        });
      }, interval);
      
      // Wait for load test to complete
      const loadResult = await loadPromise;
      clearInterval(memoryInterval);
      
      const stats = {
        loadTestResult: {
          requests: loadResult.requests,
          latency: loadResult.latency,
          errors: loadResult.errors
        },
        memoryUsage: memoryMeasurements,
        duration,
        interval
      };
      
      saveResults('memory-usage-sustained-load', stats);
      
      // Assertions
      expect(loadResult.errors).toBe(0);
      expect(memoryMeasurements.length).toBeGreaterThan(5);
      
      // Check for memory leaks (memory should not continuously increase)
      const firstMeasurement = memoryMeasurements[0];
      const lastMeasurement = memoryMeasurements[memoryMeasurements.length - 1];
      const memoryIncrease = lastMeasurement.heapUsed - firstMeasurement.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / firstMeasurement.heapUsed) * 100;
      
      // Memory increase should be reasonable (less than 50% over 1 minute)
      expect(memoryIncreasePercent).toBeLessThan(50);
      
      console.log(`Memory usage - Initial: ${(firstMeasurement.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(lastMeasurement.heapUsed / 1024 / 1024).toFixed(2)}MB, Increase: ${memoryIncreasePercent.toFixed(2)}%`);
    }, 120000);
  });
  
  describe('Stress Testing', () => {
    test('API stress test - high connection count', async () => {
      const result = await autocannon({
        url: `${baseUrl}/health`,
        connections: 100,
        duration: 30,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      saveResults('api-stress-high-connections', result);
      
      // Under stress, we allow for some degradation but no failures
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.non2xx).toBe(0);
      expect(result.requests.average).toBeGreaterThan(20); // At least 20 req/sec under stress
      expect(result.latency.p99).toBeLessThan(2000); // 99th percentile under 2 seconds
      
      console.log(`Stress test - Avg RPS: ${result.requests.average}, P99 Latency: ${result.latency.p99}ms, Errors: ${result.errors}`);
    }, 60000);
    
    test('API stress test - sustained high load', async () => {
      const result = await autocannon({
        url: `${baseUrl}/health`,
        connections: 50,
        duration: 120, // 2 minutes
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      saveResults('api-stress-sustained-load', result);
      
      // Sustained load test
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.non2xx).toBe(0);
      expect(result.requests.average).toBeGreaterThan(30); // At least 30 req/sec sustained
      expect(result.latency.p95).toBeLessThan(1000); // 95th percentile under 1 second
      
      console.log(`Sustained load test - Avg RPS: ${result.requests.average}, P95 Latency: ${result.latency.p95}ms, Duration: ${result.duration}s`);
    }, 180000);
  });
  
  describe('Performance Regression Detection', () => {
    test('Baseline performance measurement', async () => {
      // This test establishes baseline performance metrics
      const baselineTests = [
        { name: 'health-baseline', url: `${baseUrl}/health`, connections: 10, duration: 30 },
        { name: 'status-baseline', url: `${baseUrl}/api/v1/status`, connections: 10, duration: 30 }
      ];
      
      const baselines = {};
      
      for (const test of baselineTests) {
        const result = await autocannon({
          url: test.url,
          connections: test.connections,
          duration: test.duration,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        baselines[test.name] = {
          averageRPS: result.requests.average,
          p95Latency: result.latency.p95,
          p99Latency: result.latency.p99,
          errors: result.errors,
          timestamp: new Date().toISOString()
        };
        
        // Basic assertions
        expect(result.errors).toBe(0);
        expect(result.timeouts).toBe(0);
        expect(result.non2xx).toBe(0);
      }
      
      saveResults('performance-baselines', baselines);
      
      console.log('Baseline performance metrics established:', JSON.stringify(baselines, null, 2));
    }, 120000);
  });
  
  describe('Performance Monitoring', () => {
    test('Response time distribution analysis', async () => {
      const result = await autocannon({
        url: `${baseUrl}/health`,
        connections: 25,
        duration: 60,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const distribution = {
        min: result.latency.min,
        max: result.latency.max,
        mean: result.latency.mean,
        stddev: result.latency.stddev,
        p1: result.latency.p1,
        p2_5: result.latency.p2_5,
        p10: result.latency.p10,
        p25: result.latency.p25,
        p50: result.latency.p50,
        p75: result.latency.p75,
        p90: result.latency.p90,
        p97_5: result.latency.p97_5,
        p99: result.latency.p99,
        p99_9: result.latency.p99_9,
        p99_99: result.latency.p99_99,
        p99_999: result.latency.p99_999
      };
      
      saveResults('response-time-distribution', {
        distribution,
        requests: result.requests,
        throughput: result.throughput,
        errors: result.errors
      });
      
      // Assertions for response time distribution
      expect(result.errors).toBe(0);
      expect(distribution.p50).toBeLessThan(50); // Median under 50ms
      expect(distribution.p90).toBeLessThan(100); // 90th percentile under 100ms
      expect(distribution.p99).toBeLessThan(200); // 99th percentile under 200ms
      
      console.log(`Response time distribution - P50: ${distribution.p50}ms, P90: ${distribution.p90}ms, P99: ${distribution.p99}ms`);
    }, 90000);
  });
});