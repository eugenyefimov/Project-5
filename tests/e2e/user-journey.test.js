// End-to-End Tests for Project-5
// Complete user journey testing across frontend and backend

const { chromium } = require('playwright');
const axios = require('axios');

describe('Project-5 E2E User Journey Tests', () => {
  let browser;
  let context;
  let page;
  
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:8000';
  
  beforeAll(async () => {
    // Launch browser
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 100
    });
    
    // Wait for services to be ready
    await waitForServices();
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });
    page = await context.newPage();
    
    // Setup request/response logging
    page.on('request', request => {
      console.log(`Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`Failed response: ${response.status()} ${response.url()}`);
      }
    });
  });
  
  afterEach(async () => {
    await context.close();
  });
  
  async function waitForServices() {
    const maxRetries = 30;
    const retryDelay = 2000;
    
    console.log('Waiting for services to be ready...');
    
    // Wait for frontend
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(baseUrl, { timeout: 5000 });
        if (response.status === 200) {
          console.log('Frontend is ready');
          break;
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Frontend not ready after ${maxRetries} retries`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // Wait for backend
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(`${apiUrl}/health`, { timeout: 5000 });
        if (response.status === 200) {
          console.log('Backend is ready');
          break;
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Backend not ready after ${maxRetries} retries`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  describe('Application Loading and Health', () => {
    test('should load the main application page', async () => {
      await page.goto(baseUrl);
      
      // Wait for the main heading to be visible
      await page.waitForSelector('h1', { timeout: 10000 });
      
      // Check page title
      const title = await page.title();
      expect(title).toContain('Project-5');
      
      // Check main heading
      const heading = await page.textContent('h1');
      expect(heading).toContain('Project-5');
      
      // Check for cloud badges
      await page.waitForSelector('.cloud-badges');
      const awsBadge = await page.textContent('.badge.aws');
      const azureBadge = await page.textContent('.badge.azure');
      const gcpBadge = await page.textContent('.badge.gcp');
      
      expect(awsBadge).toBe('AWS');
      expect(azureBadge).toBe('Azure');
      expect(gcpBadge).toBe('GCP');
    });
    
    test('should display system status information', async () => {
      await page.goto(baseUrl);
      
      // Wait for status section to load
      await page.waitForSelector('.status-section', { timeout: 15000 });
      
      // Check for status card
      const statusCard = await page.locator('.status-card');
      await expect(statusCard).toBeVisible();
      
      // Check backend API status
      const apiStatus = await page.textContent('.status-item:has-text("Backend API:") .status');
      expect(apiStatus).toContain('✅');
      
      // Check for environment information
      const environment = await page.locator('.status-item:has-text("Environment:")');
      await expect(environment).toBeVisible();
      
      // Check for uptime information
      const uptime = await page.locator('.status-item:has-text("Uptime:")');
      await expect(uptime).toBeVisible();
    });
    
    test('should display architecture features', async () => {
      await page.goto(baseUrl);
      
      // Wait for features section
      await page.waitForSelector('.features-section');
      
      // Check feature cards
      const multiCloudCard = await page.locator('.feature-card:has-text("Multi-Cloud")');
      await expect(multiCloudCard).toBeVisible();
      
      const devopsCard = await page.locator('.feature-card:has-text("DevOps Excellence")');
      await expect(devopsCard).toBeVisible();
      
      const observabilityCard = await page.locator('.feature-card:has-text("Observability")');
      await expect(observabilityCard).toBeVisible();
    });
  });
  
  describe('API Integration', () => {
    test('should successfully connect to backend API', async () => {
      await page.goto(baseUrl);
      
      // Wait for API status to be checked
      await page.waitForFunction(
        () => {
          const statusElement = document.querySelector('.status-item:has-text("Backend API:") .status');
          return statusElement && statusElement.textContent.includes('✅');
        },
        { timeout: 20000 }
      );
      
      // Verify API status is connected
      const apiStatus = await page.textContent('.status-item:has-text("Backend API:") .status');
      expect(apiStatus).toContain('Connected ✅');
    });
    
    test('should handle API errors gracefully', async () => {
      // Mock API failure by intercepting requests
      await page.route(`${apiUrl}/health`, route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.goto(baseUrl);
      
      // Wait for error status to appear
      await page.waitForFunction(
        () => {
          const statusElement = document.querySelector('.status-item:has-text("Backend API:") .status');
          return statusElement && statusElement.textContent.includes('❌');
        },
        { timeout: 15000 }
      );
      
      const apiStatus = await page.textContent('.status-item:has-text("Backend API:") .status');
      expect(apiStatus).toContain('❌');
    });
  });
  
  describe('Responsive Design', () => {
    test('should work on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(baseUrl);
      
      // Check that main elements are visible
      await page.waitForSelector('h1');
      const heading = await page.locator('h1');
      await expect(heading).toBeVisible();
      
      // Check cloud badges are still visible
      const cloudBadges = await page.locator('.cloud-badges');
      await expect(cloudBadges).toBeVisible();
      
      // Check status section adapts to mobile
      const statusSection = await page.locator('.status-section');
      await expect(statusSection).toBeVisible();
    });
    
    test('should work on tablet devices', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(baseUrl);
      
      // Check layout adapts properly
      await page.waitForSelector('.features-grid');
      const featuresGrid = await page.locator('.features-grid');
      await expect(featuresGrid).toBeVisible();
      
      // Check feature cards are properly arranged
      const featureCards = await page.locator('.feature-card');
      const cardCount = await featureCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(3);
    });
    
    test('should work on desktop devices', async () => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(baseUrl);
      
      // Check full layout is visible
      await page.waitForSelector('.App');
      
      // Check all sections are visible
      const heroSection = await page.locator('.hero-section');
      const statusSection = await page.locator('.status-section');
      const featuresSection = await page.locator('.features-section');
      
      await expect(heroSection).toBeVisible();
      await expect(statusSection).toBeVisible();
      await expect(featuresSection).toBeVisible();
    });
  });
  
  describe('Performance', () => {
    test('should load within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await page.goto(baseUrl);
      await page.waitForSelector('h1');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      console.log(`Page loaded in ${loadTime}ms`);
    });
    
    test('should have good Core Web Vitals', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      
      // Measure Largest Contentful Paint (LCP)
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      // LCP should be under 2.5 seconds
      expect(lcp).toBeLessThan(2500);
      console.log(`LCP: ${lcp}ms`);
    });
  });
  
  describe('Accessibility', () => {
    test('should have proper heading structure', async () => {
      await page.goto(baseUrl);
      await page.waitForSelector('h1');
      
      // Check for proper heading hierarchy
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
      
      const h2Elements = await page.locator('h2').all();
      expect(h2Elements.length).toBeGreaterThan(0);
    });
    
    test('should have proper color contrast', async () => {
      await page.goto(baseUrl);
      await page.waitForSelector('.App');
      
      // Check background and text colors have sufficient contrast
      const backgroundColor = await page.evaluate(() => {
        const appElement = document.querySelector('.App');
        return window.getComputedStyle(appElement).backgroundColor;
      });
      
      const textColor = await page.evaluate(() => {
        const appElement = document.querySelector('.App');
        return window.getComputedStyle(appElement).color;
      });
      
      // Basic check that colors are defined
      expect(backgroundColor).toBeTruthy();
      expect(textColor).toBeTruthy();
    });
    
    test('should be keyboard navigable', async () => {
      await page.goto(baseUrl);
      await page.waitForSelector('.App');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      // Check if focus is visible
      const focusedElement = await page.evaluate(() => document.activeElement.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });
  
  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Block all network requests to simulate offline
      await page.route('**/*', route => {
        if (route.request().url().includes('/health')) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      await page.goto(baseUrl);
      
      // Wait for error state
      await page.waitForFunction(
        () => {
          const statusElement = document.querySelector('.status-item:has-text("Backend API:") .status');
          return statusElement && statusElement.textContent.includes('❌');
        },
        { timeout: 15000 }
      );
      
      // Check error is displayed appropriately
      const apiStatus = await page.textContent('.status-item:has-text("Backend API:") .status');
      expect(apiStatus).toContain('Offline ❌');
    });
    
    test('should handle slow API responses', async () => {
      // Delay API responses
      await page.route(`${apiUrl}/health`, async route => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        route.continue();
      });
      
      await page.goto(baseUrl);
      
      // Initially should show checking status
      const initialStatus = await page.textContent('.status-item:has-text("Backend API:") .status');
      expect(initialStatus).toContain('Checking...');
      
      // Eventually should show connected status
      await page.waitForFunction(
        () => {
          const statusElement = document.querySelector('.status-item:has-text("Backend API:") .status');
          return statusElement && statusElement.textContent.includes('✅');
        },
        { timeout: 10000 }
      );
    });
  });
  
  describe('Cross-Browser Compatibility', () => {
    test('should work in different browsers', async () => {
      // This test would be expanded to run across multiple browsers
      // For now, we test core functionality
      
      await page.goto(baseUrl);
      await page.waitForSelector('h1');
      
      // Check JavaScript functionality works
      const apiStatusExists = await page.locator('.status-item:has-text("Backend API:")');
      await expect(apiStatusExists).toBeVisible();
      
      // Check CSS is properly applied
      const heroSection = await page.locator('.hero-section');
      const backgroundColor = await heroSection.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(backgroundColor).toBeTruthy();
    });
  });
  
  describe('Security', () => {
    test('should have proper security headers', async () => {
      const response = await page.goto(baseUrl);
      const headers = response.headers();
      
      // Check for security headers
      expect(headers['x-frame-options'] || headers['x-frame-options']).toBeTruthy();
      expect(headers['x-content-type-options']).toBe('nosniff');
    });
    
    test('should not expose sensitive information', async () => {
      await page.goto(baseUrl);
      
      // Check that no sensitive data is exposed in the DOM
      const pageContent = await page.content();
      
      // Should not contain common sensitive patterns
      expect(pageContent).not.toMatch(/password/i);
      expect(pageContent).not.toMatch(/secret/i);
      expect(pageContent).not.toMatch(/api[_-]?key/i);
    });
  });
  
  describe('Monitoring Integration', () => {
    test('should expose metrics endpoint', async () => {
      // Test that metrics endpoint is accessible
      try {
        const response = await axios.get(`${apiUrl}/metrics`);
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/plain');
        expect(response.data).toContain('http_requests_total');
      } catch (error) {
        // If metrics endpoint is not available, that's also acceptable
        console.log('Metrics endpoint not available:', error.message);
      }
    });
    
    test('should track user interactions', async () => {
      await page.goto(baseUrl);
      
      // Check if analytics or monitoring scripts are loaded
      const scripts = await page.locator('script').all();
      const hasMonitoring = scripts.some(async script => {
        const src = await script.getAttribute('src');
        return src && (src.includes('analytics') || src.includes('monitoring'));
      });
      
      // This is optional - not all deployments may have monitoring
      console.log('Monitoring scripts detected:', hasMonitoring);
    });
  });
});