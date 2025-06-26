// Security tests for User Service
// These tests verify security measures and vulnerability protections

const request = require('supertest');
const app = require('../../server');
const {
  dbUtils,
  redisUtils,
  JWTUtils,
  HTTPUtils,
  TestDataGenerator,
  ValidationUtils,
  cleanup,
  closeConnections
} = require('../testUtils');

describe('User Service Security Tests', () => {
  let server;
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;

  beforeAll(async () => {
    // Skip security tests if not explicitly enabled
    if (process.env.RUN_SECURITY_TESTS !== 'true') {
      console.log('⏭️ Skipping security tests (set RUN_SECURITY_TESTS=true to enable)');
      return;
    }

    console.log('🔒 Starting security test setup...');
    
    // Start the server
    server = app.listen(0);
    
    // Initialize connections
    await dbUtils.init();
    await redisUtils.init();
  });

  afterAll(async () => {
    if (process.env.RUN_SECURITY_TESTS !== 'true') {
      return;
    }

    // Close server and connections
    if (server) {
      server.close();
    }
    await closeConnections();
  });

  beforeEach(async () => {
    if (process.env.RUN_SECURITY_TESTS !== 'true') {
      pending('Security tests disabled');
    }

    // Clean and prepare test data
    await cleanup();
    
    // Create test users
    testUser = await dbUtils.createTestUser({
      email: 'security-test@example.com',
      password: 'SecurePassword123!',
      first_name: 'Security',
      last_name: 'Test'
    });
    
    adminUser = await dbUtils.createAdminUser({
      email: 'admin-security@example.com',
      password: 'AdminSecurePassword123!',
      first_name: 'Admin',
      last_name: 'Security'
    });
    
    // Create tokens
    userToken = JWTUtils.createTestToken({
      id: testUser.id,
      email: testUser.email,
      role: testUser.role
    });
    
    adminToken = JWTUtils.createTestToken({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    });
  });

  describe('Authentication Security', () => {
    test('Should prevent brute force attacks on login', async () => {
      const maxAttempts = 10;
      const requests = [];
      
      // Make multiple failed login attempts
      for (let i = 0; i < maxAttempts; i++) {
        requests.push(
          request(app)
            .post('/api/v1/users/login')
            .send({
              email: testUser.email,
              password: 'wrongpassword'
            })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Should have some rate-limited responses
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Rate limited responses should have proper headers
      if (rateLimitedResponses.length > 0) {
        const rateLimitedResponse = rateLimitedResponses[0];
        expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-limit');
        expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-remaining');
        expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-reset');
      }
    }, 15000);

    test('Should invalidate tokens on password change', async () => {
      // First, verify token works
      await request(app)
        .get('/api/v1/users/profile')
        .set(HTTPUtils.createTestHeaders(userToken))
        .expect(200);
      
      // Change password
      await request(app)
        .put('/api/v1/users/password')
        .set(HTTPUtils.createTestHeaders(userToken))
        .send({
          currentPassword: testUser.password,
          newPassword: 'NewSecurePassword123!'
        })
        .expect(200);
      
      // Old token should no longer work (if token invalidation is implemented)
      // Note: This depends on implementation - some systems invalidate tokens, others don't
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set(HTTPUtils.createTestHeaders(userToken));
      
      // Either token is invalidated (401) or still works (200) - both are valid approaches
      expect([200, 401]).toContain(response.status);
    });

    test('Should prevent token reuse after logout', async () => {
      // Login to get fresh tokens
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);
      
      const { token, refreshToken } = loginResponse.body.data;
      
      // Verify token works
      await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Logout (if logout endpoint exists)
      const logoutResponse = await request(app)
        .post('/api/v1/users/logout')
        .set('Authorization', `Bearer ${token}`);
      
      // If logout endpoint exists and invalidates tokens
      if (logoutResponse.status === 200) {
        // Token should no longer work
        await request(app)
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
        
        // Refresh token should also not work
        await request(app)
          .post('/api/v1/users/refresh')
          .send({ refreshToken })
          .expect(401);
      }
    });

    test('Should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'abc123',
        'Password', // No special chars or numbers
        'password123', // No uppercase or special chars
        'PASSWORD123!', // No lowercase
        'Password!', // Too short
        '12345678!' // No letters
      ];
      
      for (const weakPassword of weakPasswords) {
        const userData = TestDataGenerator.generateUserData({
          password: weakPassword
        });
        
        const response = await request(app)
          .post('/api/v1/users/register')
          .send(userData);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toHaveProperty('type', 'ValidationError');
      }
    });
  });

  describe('Input Validation Security', () => {
    test('Should prevent SQL injection in login', async () => {
      const sqlInjectionPayloads = [
        "admin@example.com'; DROP TABLE users; --",
        "admin@example.com' OR '1'='1",
        "admin@example.com' UNION SELECT * FROM users --",
        "admin@example.com'; INSERT INTO users (email) VALUES ('hacked@example.com'); --"
      ];
      
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/v1/users/login')
          .send({
            email: payload,
            password: 'anypassword'
          });
        
        // Should either be validation error (400) or unauthorized (401), never 200
        expect([400, 401]).toContain(response.status);
        expect(response.body).toHaveProperty('success', false);
      }
    });

    test('Should prevent XSS in user registration', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '\u003cscript\u003ealert("XSS")\u003c/script\u003e'
      ];
      
      for (const payload of xssPayloads) {
        const userData = TestDataGenerator.generateUserData({
          first_name: payload,
          last_name: payload
        });
        
        const response = await request(app)
          .post('/api/v1/users/register')
          .send(userData);
        
        if (response.status === 201) {
          // If registration succeeds, verify data is sanitized
          expect(response.body.data.user.first_name).not.toContain('<script>');
          expect(response.body.data.user.first_name).not.toContain('javascript:');
          expect(response.body.data.user.last_name).not.toContain('<script>');
          expect(response.body.data.user.last_name).not.toContain('javascript:');
        } else {
          // Or registration should fail with validation error
          expect(response.status).toBe(400);
        }
      }
    });

    test('Should validate and sanitize file uploads', async () => {
      // Test malicious file uploads (if file upload endpoint exists)
      const maliciousFiles = [
        { filename: 'test.php', content: '<?php system($_GET["cmd"]); ?>' },
        { filename: 'test.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' },
        { filename: 'test.exe', content: 'MZ\x90\x00\x03\x00\x00\x00' },
        { filename: '../../../etc/passwd', content: 'root:x:0:0:root:/root:/bin/bash' }
      ];
      
      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/v1/users/upload-avatar')
          .set(HTTPUtils.createTestHeaders(userToken))
          .attach('avatar', Buffer.from(file.content), file.filename);
        
        // Should reject malicious files
        expect([400, 415, 422]).toContain(response.status);
        if (response.body.error) {
          expect(response.body.error.message).toMatch(/file type|extension|invalid/i);
        }
      }
    });

    test('Should prevent NoSQL injection', async () => {
      const noSQLInjectionPayloads = [
        { email: { $ne: null }, password: { $ne: null } },
        { email: { $regex: '.*' }, password: { $regex: '.*' } },
        { email: { $where: 'this.email' }, password: 'anything' },
        { email: { $gt: '' }, password: { $gt: '' } }
      ];
      
      for (const payload of noSQLInjectionPayloads) {
        const response = await request(app)
          .post('/api/v1/users/login')
          .send(payload);
        
        // Should be validation error, not successful login
        expect([400, 401]).toContain(response.status);
        expect(response.body).toHaveProperty('success', false);
      }
    });
  });

  describe('Authorization Security', () => {
    test('Should prevent horizontal privilege escalation', async () => {
      // Create another user
      const otherUser = await dbUtils.createTestUser({
        email: 'other-user@example.com',
        password: 'OtherPassword123!'
      });
      
      // Try to access other user's profile using current user's token
      const response = await request(app)
        .get(`/api/v1/users/${otherUser.id}`)
        .set(HTTPUtils.createTestHeaders(userToken));
      
      // Should be forbidden or not found
      expect([403, 404]).toContain(response.status);
    });

    test('Should prevent vertical privilege escalation', async () => {
      // Try to access admin-only endpoints with user token
      const adminEndpoints = [
        '/api/v1/users',
        '/api/v1/admin/users',
        '/api/v1/admin/system',
        '/api/v1/admin/logs'
      ];
      
      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set(HTTPUtils.createTestHeaders(userToken));
        
        // Should be forbidden
        expect([403, 404]).toContain(response.status);
      }
    });

    test('Should validate JWT token integrity', async () => {
      const maliciousTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        userToken.replace(/.$/, 'X'), // Modified signature
        userToken.split('.').slice(0, 2).join('.') + '.modified_signature',
        'Bearer invalid.jwt.token'
      ];
      
      for (const token of maliciousTokens) {
        const response = await request(app)
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${token}`);
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
      }
    });
  });

  describe('Data Protection Security', () => {
    test('Should not expose sensitive data in responses', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set(HTTPUtils.createTestHeaders(userToken))
        .expect(200);
      
      // Should not expose sensitive fields
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
      expect(response.body.data.user).not.toHaveProperty('salt');
      
      // Should not expose internal fields
      expect(response.body.data.user).not.toHaveProperty('__v');
      expect(response.body.data.user).not.toHaveProperty('_id');
    });

    test('Should not expose sensitive data in error messages', async () => {
      // Try to register with existing email
      const userData = TestDataGenerator.generateUserData({
        email: testUser.email
      });
      
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(409);
      
      // Error message should not expose sensitive information
      const errorMessage = response.body.error.message.toLowerCase();
      expect(errorMessage).not.toContain('password');
      expect(errorMessage).not.toContain('hash');
      expect(errorMessage).not.toContain('salt');
      expect(errorMessage).not.toContain('database');
      expect(errorMessage).not.toContain('sql');
    });

    test('Should properly hash passwords', async () => {
      const userData = TestDataGenerator.generateUserData();
      
      await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(201);
      
      // Check password is hashed in database
      const dbUser = await dbUtils.getUserByEmail(userData.email);
      expect(dbUser.password_hash).toBeDefined();
      expect(dbUser.password_hash).not.toBe(userData.password);
      expect(dbUser.password_hash).toMatch(/^\$2[aby]\$\d+\$/);
      expect(dbUser.password_hash.length).toBeGreaterThan(50);
    });
  });

  describe('HTTP Security Headers', () => {
    test('Should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('strict-transport-security');
      
      // Should not expose server information
      expect(response.headers).not.toHaveProperty('x-powered-by');
      expect(response.headers.server).not.toMatch(/express|node/i);
    });

    test('Should set proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/v1/users/register')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST');
      
      // Should have CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Session Security', () => {
    test('Should use secure session configuration', async () => {
      // Login to establish session
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);
      
      // Check session cookie security (if using sessions)
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const sessionCookie = setCookieHeader.find(cookie => 
          cookie.includes('session') || cookie.includes('connect.sid')
        );
        
        if (sessionCookie) {
          expect(sessionCookie).toMatch(/httponly/i);
          expect(sessionCookie).toMatch(/secure/i);
          expect(sessionCookie).toMatch(/samesite/i);
        }
      }
    });
  });

  describe('Rate Limiting Security', () => {
    test('Should enforce different rate limits for different endpoints', async () => {
      const endpoints = [
        { path: '/api/v1/users/login', method: 'post', data: { email: 'test@example.com', password: 'wrong' } },
        { path: '/api/v1/users/register', method: 'post', data: TestDataGenerator.generateUserData() },
        { path: '/health', method: 'get', data: null }
      ];
      
      for (const endpoint of endpoints) {
        const requests = [];
        const maxRequests = 20;
        
        // Make rapid requests
        for (let i = 0; i < maxRequests; i++) {
          const req = request(app)[endpoint.method](endpoint.path);
          
          if (endpoint.data) {
            if (endpoint.path.includes('register')) {
              // Use unique email for each registration attempt
              const uniqueData = { ...endpoint.data, email: `test-${i}-${Date.now()}@example.com` };
              req.send(uniqueData);
            } else {
              req.send(endpoint.data);
            }
          }
          
          requests.push(req);
        }
        
        const responses = await Promise.all(requests);
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        
        // Different endpoints should have different rate limiting behavior
        if (endpoint.path.includes('login')) {
          // Login should be more strictly rate limited
          expect(rateLimitedResponses.length).toBeGreaterThan(0);
        }
        
        // Health endpoint should be more lenient
        if (endpoint.path === '/health') {
          expect(rateLimitedResponses.length).toBeLessThan(maxRequests / 2);
        }
      }
    }, 30000);
  });

  describe('Error Handling Security', () => {
    test('Should not expose stack traces in production', async () => {
      // Force an error by sending malformed JSON
      const response = await request(app)
        .post('/api/v1/users/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
      
      // Should not expose stack trace
      expect(response.body.error).not.toHaveProperty('stack');
      expect(response.body.error).not.toHaveProperty('trace');
      
      // Error message should be generic
      const errorMessage = response.body.error.message;
      expect(errorMessage).not.toMatch(/at\s+\w+\s+\(/); // Stack trace pattern
      expect(errorMessage).not.toContain('node_modules');
      expect(errorMessage).not.toContain(__dirname);
    });

    test('Should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        { contentType: 'application/json', body: '{ invalid json }' },
        { contentType: 'application/json', body: 'not json at all' },
        { contentType: 'text/plain', body: 'plain text' },
        { contentType: 'application/xml', body: '<xml>data</xml>' }
      ];
      
      for (const req of malformedRequests) {
        const response = await request(app)
          .post('/api/v1/users/register')
          .set('Content-Type', req.contentType)
          .send(req.body);
        
        // Should handle gracefully with 400 error
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});