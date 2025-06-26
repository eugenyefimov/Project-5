const request = require('supertest');
const app = require('../server');
const { Pool } = require('pg');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('pg');
jest.mock('redis');

describe('User Service Tests', () => {
  let server;
  let mockPool;
  let mockRedisClient;

  beforeAll(async () => {
    // Setup mock database
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    };
    Pool.mockImplementation(() => mockPool);

    // Setup mock Redis
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      connect: jest.fn(),
      quit: jest.fn()
    };
    redis.createClient = jest.fn(() => mockRedisClient);

    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Endpoints', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        service: 'user-service',
        version: expect.any(String)
      });
    });

    test('GET /ready should return 200 when dependencies are healthy', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ now: new Date() }] });
      mockRedisClient.get.mockResolvedValue('test');

      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ready',
        timestamp: expect.any(String),
        dependencies: {
          database: 'healthy',
          redis: 'healthy'
        }
      });
    });

    test('GET /ready should return 503 when database is unhealthy', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      mockRedisClient.get.mockResolvedValue('test');

      const response = await request(app)
        .get('/ready')
        .expect(503);

      expect(response.body.status).toBe('not ready');
      expect(response.body.dependencies.database).toBe('unhealthy');
    });
  });

  describe('User Registration', () => {
    test('POST /api/v1/auth/register should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Mock database responses
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Check if user exists
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            email: userData.email, 
            first_name: userData.firstName,
            last_name: userData.lastName,
            created_at: new Date()
          }] 
        }); // Insert user

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        user: {
          id: 1,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          createdAt: expect.any(String)
        }
      });
    });

    test('POST /api/v1/auth/register should return 400 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    test('POST /api/v1/auth/register should return 400 for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('password');
    });

    test('POST /api/v1/auth/register should return 409 for existing user', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Mock user already exists
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, email: userData.email }] 
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('User Authentication', () => {
    test('POST /api/v1/auth/login should authenticate valid user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const hashedPassword = await bcrypt.hash(loginData.password, 12);
      const mockUser = {
        id: 1,
        email: loginData.email,
        password_hash: hashedPassword,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        is_active: true
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      mockRedisClient.set.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.first_name,
          lastName: mockUser.last_name,
          role: mockUser.role
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }
      });
    });

    test('POST /api/v1/auth/login should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    test('POST /api/v1/auth/login should return 401 for inactive user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const hashedPassword = await bcrypt.hash(loginData.password, 12);
      const mockUser = {
        id: 1,
        email: loginData.email,
        password_hash: hashedPassword,
        is_active: false
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account is deactivated');
    });
  });

  describe('Protected Routes', () => {
    let authToken;

    beforeEach(() => {
      authToken = jwt.sign(
        { 
          userId: 1, 
          email: 'test@example.com', 
          role: 'user' 
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    test('GET /api/v1/users/profile should return user profile', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.first_name,
          lastName: mockUser.last_name,
          role: mockUser.role,
          createdAt: expect.any(String)
        }
      });
    });

    test('GET /api/v1/users/profile should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });

    test('PUT /api/v1/users/profile should update user profile', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        first_name: updateData.firstName,
        last_name: updateData.lastName,
        role: 'user',
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [updatedUser] });

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          role: updatedUser.role,
          updatedAt: expect.any(String)
        }
      });
    });
  });

  describe('Password Management', () => {
    let authToken;

    beforeEach(() => {
      authToken = jwt.sign(
        { 
          userId: 1, 
          email: 'test@example.com', 
          role: 'user' 
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    test('POST /api/v1/users/change-password should change password', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      };

      const hashedOldPassword = await bcrypt.hash(passwordData.currentPassword, 12);
      const mockUser = {
        id: 1,
        password_hash: hashedOldPassword
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get current user
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Update password

      const response = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password changed successfully'
      });
    });

    test('POST /api/v1/users/change-password should return 400 for wrong current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!'
      };

      const hashedOldPassword = await bcrypt.hash('OldPassword123!', 12);
      const mockUser = {
        id: 1,
        password_hash: hashedOldPassword
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Current password is incorrect');
    });
  });

  describe('Rate Limiting', () => {
    test('Should apply rate limiting to login endpoint', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      // Make multiple requests to trigger rate limiting
      const requests = Array(6).fill().map(() => 
        request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);
      
      // Last request should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
    });
  });

  describe('Input Validation', () => {
    test('Should validate email format', async () => {
      const userData = {
        email: 'invalid-email-format',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('valid email');
    });

    test('Should validate password strength', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('password');
    });

    test('Should validate required fields', async () => {
      const userData = {
        email: 'test@example.com'
        // Missing password, firstName, lastName
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });
  });

  describe('Error Handling', () => {
    test('Should handle database errors gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Internal server error');
    });

    test('Should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      const response = await request(app)
        .get('/ready')
        .expect(503);

      expect(response.body.status).toBe('not ready');
      expect(response.body.dependencies.redis).toBe('unhealthy');
    });
  });

  describe('Metrics Endpoint', () => {
    test('GET /metrics should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });
});