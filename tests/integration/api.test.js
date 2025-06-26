// Integration Tests for Project-5 Backend API
// Tests API endpoints and database interactions

const request = require('supertest');
const { Pool } = require('pg');
const Redis = require('redis');
const app = require('../../applications/backend-api/src/server');

describe('API Integration Tests', () => {
  let server;
  let dbPool;
  let redisClient;

  beforeAll(async () => {
    // Setup test database connection
    dbPool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || 5432,
      database: process.env.TEST_DB_NAME || 'project5_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'password'
    });

    // Setup test Redis connection
    redisClient = Redis.createClient({
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: process.env.TEST_REDIS_PORT || 6379
    });

    await redisClient.connect();

    // Start server
    server = app.listen(0); // Use random available port
  });

  afterAll(async () => {
    // Cleanup
    await dbPool.end();
    await redisClient.quit();
    await server.close();
  });

  beforeEach(async () => {
    // Clean test data before each test
    await dbPool.query('TRUNCATE TABLE users, sessions CASCADE');
    await redisClient.flushDb();
  });

  describe('Health Endpoints', () => {
    test('GET /health should return system status', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
    });

    test('GET /api/v1/status should return API status', async () => {
      const response = await request(server)
        .get('/api/v1/status')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /metrics should return Prometheus metrics', async () => {
      const response = await request(server)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('http_requests_total');
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });

  describe('User Management API', () => {
    test('POST /api/v1/users should create a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(server)
        .post('/api/v1/users')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', userData.username);
      expect(response.body).toHaveProperty('email', userData.email);
      expect(response.body).not.toHaveProperty('password'); // Password should not be returned

      // Verify user was created in database
      const dbResult = await dbPool.query('SELECT * FROM users WHERE username = $1', [userData.username]);
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].email).toBe(userData.email);
    });

    test('POST /api/v1/users should validate required fields', async () => {
      const invalidUserData = {
        username: 'testuser'
        // Missing required fields
      };

      const response = await request(server)
        .post('/api/v1/users')
        .send(invalidUserData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('validation');
    });

    test('GET /api/v1/users/:id should return user details', async () => {
      // First create a user
      const userData = {
        username: 'getuser',
        email: 'getuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'Get',
        lastName: 'User'
      };

      const createResponse = await request(server)
        .post('/api/v1/users')
        .send(userData)
        .expect(201);

      const userId = createResponse.body.id;

      // Then retrieve the user
      const response = await request(server)
        .get(`/api/v1/users/${userId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('username', userData.username);
      expect(response.body).toHaveProperty('email', userData.email);
      expect(response.body).not.toHaveProperty('password');
    });

    test('GET /api/v1/users/:id should return 404 for non-existent user', async () => {
      const response = await request(server)
        .get('/api/v1/users/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('Authentication API', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user for authentication tests
      const userData = {
        username: 'authuser',
        email: 'auth@example.com',
        password: 'SecurePassword123!',
        firstName: 'Auth',
        lastName: 'User'
      };

      const response = await request(server)
        .post('/api/v1/users')
        .send(userData);

      testUser = response.body;
    });

    test('POST /api/v1/auth/login should authenticate valid credentials', async () => {
      const loginData = {
        username: 'authuser',
        password: 'SecurePassword123!'
      };

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', testUser.id);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify session was created in Redis
      const sessionKey = `session:${response.body.token}`;
      const sessionData = await redisClient.get(sessionKey);
      expect(sessionData).toBeTruthy();
    });

    test('POST /api/v1/auth/login should reject invalid credentials', async () => {
      const loginData = {
        username: 'authuser',
        password: 'WrongPassword'
      };

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('POST /api/v1/auth/logout should invalidate session', async () => {
      // First login
      const loginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({
          username: 'authuser',
          password: 'SecurePassword123!'
        });

      const token = loginResponse.body.token;

      // Then logout
      const response = await request(server)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logged out successfully');

      // Verify session was removed from Redis
      const sessionKey = `session:${token}`;
      const sessionData = await redisClient.get(sessionKey);
      expect(sessionData).toBeNull();
    });
  });

  describe('Protected Routes', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      // Create and authenticate a user
      const userData = {
        username: 'protecteduser',
        email: 'protected@example.com',
        password: 'SecurePassword123!',
        firstName: 'Protected',
        lastName: 'User'
      };

      const createResponse = await request(server)
        .post('/api/v1/users')
        .send(userData);

      testUser = createResponse.body;

      const loginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        });

      authToken = loginResponse.body.token;
    });

    test('GET /api/v1/profile should return user profile with valid token', async () => {
      const response = await request(server)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).not.toHaveProperty('password');
    });

    test('GET /api/v1/profile should return 401 without token', async () => {
      const response = await request(server)
        .get('/api/v1/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('GET /api/v1/profile should return 401 with invalid token', async () => {
      const response = await request(server)
        .get('/api/v1/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits on login endpoint', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'wrongpassword'
      };

      // Make multiple requests to trigger rate limit
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(server)
            .post('/api/v1/auth/login')
            .send(loginData)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Temporarily close database connection
      await dbPool.end();

      const response = await request(server)
        .get('/api/v1/users/1')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('database');

      // Restore database connection
      dbPool = new Pool({
        host: process.env.TEST_DB_HOST || 'localhost',
        port: process.env.TEST_DB_PORT || 5432,
        database: process.env.TEST_DB_NAME || 'project5_test',
        user: process.env.TEST_DB_USER || 'postgres',
        password: process.env.TEST_DB_PASSWORD || 'password'
      });
    });

    test('should handle Redis connection errors gracefully', async () => {
      // Temporarily disconnect Redis
      await redisClient.quit();

      const userData = {
        username: 'redisuser',
        email: 'redis@example.com',
        password: 'SecurePassword123!',
        firstName: 'Redis',
        lastName: 'User'
      };

      const createResponse = await request(server)
        .post('/api/v1/users')
        .send(userData);

      const loginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        })
        .expect(500);

      expect(loginResponse.body).toHaveProperty('error');
      expect(loginResponse.body.error).toContain('session');

      // Restore Redis connection
      redisClient = Redis.createClient({
        host: process.env.TEST_REDIS_HOST || 'localhost',
        port: process.env.TEST_REDIS_PORT || 6379
      });
      await redisClient.connect();
    });
  });

  describe('Data Validation', () => {
    test('should validate email format', async () => {
      const userData = {
        username: 'emailtest',
        email: 'invalid-email',
        password: 'SecurePassword123!',
        firstName: 'Email',
        lastName: 'Test'
      };

      const response = await request(server)
        .post('/api/v1/users')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    test('should validate password strength', async () => {
      const userData = {
        username: 'passwordtest',
        email: 'password@example.com',
        password: 'weak',
        firstName: 'Password',
        lastName: 'Test'
      };

      const response = await request(server)
        .post('/api/v1/users')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    test('should prevent duplicate usernames', async () => {
      const userData = {
        username: 'duplicateuser',
        email: 'duplicate1@example.com',
        password: 'SecurePassword123!',
        firstName: 'Duplicate',
        lastName: 'User1'
      };

      // Create first user
      await request(server)
        .post('/api/v1/users')
        .send(userData)
        .expect(201);

      // Try to create second user with same username
      const duplicateData = {
        ...userData,
        email: 'duplicate2@example.com'
      };

      const response = await request(server)
        .post('/api/v1/users')
        .send(duplicateData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('username');
    });
  });
});