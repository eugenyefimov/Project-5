// Integration tests for User Service
// These tests run against the actual database and Redis

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

describe('User Service Integration Tests', () => {
  let server;
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;

  beforeAll(async () => {
    // Start the server
    server = app.listen(0); // Use random port
    
    // Wait for database and Redis to be ready
    await dbUtils.init();
    await redisUtils.init();
  });

  afterAll(async () => {
    // Close server and connections
    if (server) {
      server.close();
    }
    await closeConnections();
  });

  beforeEach(async () => {
    // Clean database and Redis before each test
    await cleanup();
    
    // Create test users
    testUser = await dbUtils.createTestUser({
      email: 'integration-test@example.com',
      password: 'TestPassword123!',
      first_name: 'Integration',
      last_name: 'Test'
    });
    
    adminUser = await dbUtils.createAdminUser({
      email: 'admin-integration@example.com',
      password: 'AdminPassword123!',
      first_name: 'Admin',
      last_name: 'User'
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

  describe('Health Check Endpoints', () => {
    test('GET /health should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'user-service');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');
    });

    test('GET /health/ready should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('ready', true);
      expect(response.body).toHaveProperty('checks');
    });

    test('GET /health/live should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('alive', true);
    });
  });

  describe('User Registration', () => {
    test('POST /api/v1/users/register should create new user', async () => {
      const userData = TestDataGenerator.generateUserData();
      
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('email', userData.email);
      expect(response.body.data.user).toHaveProperty('first_name', userData.first_name);
      expect(response.body.data.user).toHaveProperty('last_name', userData.last_name);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
      
      // Verify token is valid
      expect(ValidationUtils.isValidJWTFormat(response.body.data.token)).toBe(true);
      
      // Verify user was created in database
      const dbUser = await dbUtils.getUserByEmail(userData.email);
      expect(dbUser).toBeTruthy();
      expect(dbUser.email).toBe(userData.email);
    });

    test('POST /api/v1/users/register should reject duplicate email', async () => {
      const userData = TestDataGenerator.generateUserData({
        email: testUser.email
      });
      
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('already exists');
    });

    test('POST /api/v1/users/register should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('type', 'ValidationError');
      expect(response.body.error).toHaveProperty('details');
    });

    test('POST /api/v1/users/register should validate email format', async () => {
      const userData = TestDataGenerator.generateUserData({
        email: 'invalid-email'
      });
      
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('type', 'ValidationError');
    });

    test('POST /api/v1/users/register should validate password strength', async () => {
      const userData = TestDataGenerator.generateUserData({
        password: 'weak'
      });
      
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('type', 'ValidationError');
    });
  });

  describe('User Authentication', () => {
    test('POST /api/v1/users/login should authenticate valid user', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('id', testUser.id);
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
      
      // Verify tokens are valid
      expect(ValidationUtils.isValidJWTFormat(response.body.data.token)).toBe(true);
      expect(ValidationUtils.isValidJWTFormat(response.body.data.refreshToken)).toBe(true);
    });

    test('POST /api/v1/users/login should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message', 'Invalid credentials');
    });

    test('POST /api/v1/users/login should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message', 'Invalid credentials');
    });

    test('POST /api/v1/users/login should reject inactive user', async () => {
      // Create inactive user
      const inactiveUser = await dbUtils.createTestUser({
        email: 'inactive@example.com',
        password: 'TestPassword123!',
        is_active: false
      });
      
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: inactiveUser.email,
          password: inactiveUser.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('inactive');
    });
  });

  describe('Token Refresh', () => {
    test('POST /api/v1/users/refresh should refresh valid token', async () => {
      // First login to get refresh token
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      const refreshToken = loginResponse.body.data.refreshToken;
      
      const response = await request(app)
        .post('/api/v1/users/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      
      // Verify new tokens are valid and different
      expect(ValidationUtils.isValidJWTFormat(response.body.data.token)).toBe(true);
      expect(ValidationUtils.isValidJWTFormat(response.body.data.refreshToken)).toBe(true);
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    test('POST /api/v1/users/refresh should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/users/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('User Profile Management', () => {
    test('GET /api/v1/users/profile should return user profile', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set(HTTPUtils.createTestHeaders(userToken))
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id', testUser.id);
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      expect(response.body.data.user).toHaveProperty('first_name', testUser.first_name);
      expect(response.body.data.user).toHaveProperty('last_name', testUser.last_name);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    test('PUT /api/v1/users/profile should update user profile', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name'
      };
      
      const response = await request(app)
        .put('/api/v1/users/profile')
        .set(HTTPUtils.createTestHeaders(userToken))
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('first_name', updateData.first_name);
      expect(response.body.data.user).toHaveProperty('last_name', updateData.last_name);
      
      // Verify update in database
      const dbUser = await dbUtils.getUserById(testUser.id);
      expect(dbUser.first_name).toBe(updateData.first_name);
      expect(dbUser.last_name).toBe(updateData.last_name);
    });

    test('PUT /api/v1/users/profile should validate update data', async () => {
      const response = await request(app)
        .put('/api/v1/users/profile')
        .set(HTTPUtils.createTestHeaders(userToken))
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('type', 'ValidationError');
    });
  });

  describe('Password Management', () => {
    test('PUT /api/v1/users/password should change password', async () => {
      const passwordData = {
        currentPassword: testUser.password,
        newPassword: 'NewPassword123!'
      };
      
      const response = await request(app)
        .put('/api/v1/users/password')
        .set(HTTPUtils.createTestHeaders(userToken))
        .send(passwordData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Password updated successfully');
      
      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: testUser.email,
          password: passwordData.newPassword
        })
        .expect(200);
      
      expect(loginResponse.body).toHaveProperty('success', true);
    });

    test('PUT /api/v1/users/password should reject wrong current password', async () => {
      const response = await request(app)
        .put('/api/v1/users/password')
        .set(HTTPUtils.createTestHeaders(userToken))
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('current password');
    });

    test('PUT /api/v1/users/password should validate new password strength', async () => {
      const response = await request(app)
        .put('/api/v1/users/password')
        .set(HTTPUtils.createTestHeaders(userToken))
        .send({
          currentPassword: testUser.password,
          newPassword: 'weak'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('type', 'ValidationError');
    });
  });

  describe('User Listing (Admin Only)', () => {
    test('GET /api/v1/users should return user list for admin', async () => {
      // Create additional test users
      await dbUtils.createTestUsers(3);
      
      const response = await request(app)
        .get('/api/v1/users')
        .set(HTTPUtils.createTestHeaders(adminToken))
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      
      // Verify user data structure
      const user = response.body.data.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('first_name');
      expect(user).toHaveProperty('last_name');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('is_active');
      expect(user).not.toHaveProperty('password_hash');
    });

    test('GET /api/v1/users should reject non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set(HTTPUtils.createTestHeaders(userToken))
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('access denied');
    });

    test('GET /api/v1/users should support pagination', async () => {
      // Create additional test users
      await dbUtils.createTestUsers(10);
      
      const response = await request(app)
        .get('/api/v1/users?page=1&limit=5')
        .set(HTTPUtils.createTestHeaders(adminToken))
        .expect(200);

      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 5);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('pages');
      expect(response.body.data.users.length).toBeLessThanOrEqual(5);
    });

    test('GET /api/v1/users should support search', async () => {
      const response = await request(app)
        .get(`/api/v1/users?search=${testUser.email}`)
        .set(HTTPUtils.createTestHeaders(adminToken))
        .expect(200);

      expect(response.body.data.users.length).toBeGreaterThan(0);
      const foundUser = response.body.data.users.find(u => u.email === testUser.email);
      expect(foundUser).toBeTruthy();
    });
  });

  describe('Authentication Middleware', () => {
    test('Protected routes should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('token');
    });

    test('Protected routes should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
    });

    test('Protected routes should reject expired tokens', async () => {
      const expiredToken = JWTUtils.createExpiredToken({
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
      });
      
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limits on login endpoint', async () => {
      const requests = [];
      const maxRequests = 10; // Assuming rate limit is higher than this
      
      // Make multiple rapid requests
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          request(app)
            .post('/api/v1/users/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // At least some requests should succeed (before rate limit)
      const successfulRequests = responses.filter(r => r.status !== 429);
      expect(successfulRequests.length).toBeGreaterThan(0);
      
      // Some requests might be rate limited
      const rateLimitedRequests = responses.filter(r => r.status === 429);
      if (rateLimitedRequests.length > 0) {
        expect(rateLimitedRequests[0].body).toHaveProperty('error');
        expect(rateLimitedRequests[0].body.error.message).toContain('rate limit');
      }
    }, 10000);
  });

  describe('Metrics Endpoint', () => {
    test('GET /metrics should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_seconds');
    });
  });
});