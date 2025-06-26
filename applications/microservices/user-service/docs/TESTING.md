# User Service Testing Documentation

## 📋 Table of Contents

- [Overview](#overview)
- [Testing Strategy](#testing-strategy)
- [Test Environment Setup](#test-environment-setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [Test Data Management](#test-data-management)
- [Continuous Integration](#continuous-integration)
- [Test Reporting](#test-reporting)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🌐 Overview

This document outlines the comprehensive testing strategy for the User Service, covering all aspects from unit tests to end-to-end testing, performance validation, and security assessments.

### Testing Objectives

- **Quality Assurance**: Ensure code quality and functionality
- **Regression Prevention**: Catch breaking changes early
- **Performance Validation**: Verify system performance under load
- **Security Verification**: Validate security controls and measures
- **Documentation**: Provide living documentation through tests
- **Confidence**: Enable safe deployments and refactoring

### Testing Principles

- **Test Pyramid**: More unit tests, fewer integration tests, minimal E2E tests
- **Fast Feedback**: Quick test execution for rapid development cycles
- **Isolation**: Tests should be independent and not affect each other
- **Repeatability**: Tests should produce consistent results
- **Maintainability**: Tests should be easy to understand and maintain
- **Coverage**: Aim for high code coverage with meaningful tests

## 🎯 Testing Strategy

### Test Levels

```
                    ┌─────────────────────────┐
                    │     Manual Testing      │ ← Exploratory, Usability
                    └─────────────────────────┘
                    ┌─────────────────────────┐
                    │   End-to-End Tests     │ ← User Journeys
                    └─────────────────────────┘
                    ┌─────────────────────────┐
                    │  Integration Tests     │ ← API, Database
                    └─────────────────────────┘
                    ┌─────────────────────────┐
                    │     Unit Tests         │ ← Functions, Classes
                    └─────────────────────────┘
```

### Testing Framework Stack

| Test Type | Framework | Purpose |
|-----------|-----------|----------|
| Unit Tests | Jest | Fast, isolated component testing |
| Integration Tests | Jest + Supertest | API endpoint testing |
| E2E Tests | Playwright | Full user journey testing |
| Performance Tests | Artillery | Load and stress testing |
| Security Tests | OWASP ZAP | Security vulnerability scanning |
| Contract Tests | Pact | API contract validation |

### Test Coverage Goals

- **Unit Tests**: 90%+ code coverage
- **Integration Tests**: 100% API endpoint coverage
- **E2E Tests**: 100% critical user journey coverage
- **Performance Tests**: All major endpoints under load
- **Security Tests**: All authentication and authorization flows

## 🛠️ Test Environment Setup

### Local Development Setup

```bash
# Install dependencies
npm install

# Install test dependencies
npm install --save-dev jest supertest @types/jest @types/supertest

# Setup test database
docker-compose -f docker-compose.test.yml up -d

# Run database migrations for test environment
npm run migrate:test

# Seed test data
npm run seed:test
```

### Test Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/config/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000
};
```

### Test Environment Variables

```bash
# .env.test
NODE_ENV=test
PORT=3001
DB_HOST=localhost
DB_PORT=5433
DB_NAME=user_service_test
DB_USER=test_user
DB_PASSWORD=test_password
REDIS_HOST=localhost
REDIS_PORT=6380
JWT_SECRET=test_jwt_secret_key_for_testing_only
JWT_REFRESH_SECRET=test_refresh_secret_key_for_testing_only
EMAIL_PROVIDER=mock
LOG_LEVEL=error
```

### Test Database Setup

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: user_service_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    volumes:
      - postgres_test_data:/var/lib/postgresql/data

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    command: redis-server --requirepass test_password

volumes:
  postgres_test_data:
```

## 🧪 Unit Testing

### Service Layer Tests

```typescript
// tests/unit/services/user.service.test.ts
import { UserService } from '../../../src/services/user.service';
import { UserRepository } from '../../../src/repositories/user.repository';
import { PasswordService } from '../../../src/services/password.service';
import { EmailService } from '../../../src/services/email.service';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockPasswordService: jest.Mocked<PasswordService>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn()
    } as any;

    mockPasswordService = {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
      validatePassword: jest.fn()
    } as any;

    mockEmailService = {
      sendWelcomeEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn()
    } as any;

    userService = new UserService(
      mockUserRepository,
      mockPasswordService,
      mockEmailService
    );
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.validatePassword.mockReturnValue({ isValid: true, errors: [] });
      mockPasswordService.hashPassword.mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue({
        id: 'user-123',
        email: registerData.email,
        firstName: registerData.firstName,
        lastName: registerData.lastName
      } as any);

      // Act
      const result = await userService.registerUser(registerData);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(registerData.email);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(registerData.password);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const registerData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-user' } as any);

      // Act & Assert
      await expect(userService.registerUser(registerData))
        .rejects
        .toThrow('Email already registered');
    });

    it('should throw error for invalid password', async () => {
      // Arrange
      const registerData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.validatePassword.mockReturnValue({
        isValid: false,
        errors: ['Password too weak']
      });

      // Act & Assert
      await expect(userService.registerUser(registerData))
        .rejects
        .toThrow('Password too weak');
    });
  });

  describe('authenticateUser', () => {
    it('should successfully authenticate valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const user = {
        id: 'user-123',
        email: credentials.email,
        passwordHash: 'hashedPassword',
        status: 'active',
        failedLoginAttempts: 0,
        accountLocked: false
      };

      mockUserRepository.findByEmail.mockResolvedValue(user as any);
      mockPasswordService.verifyPassword.mockResolvedValue(true);

      // Act
      const result = await userService.authenticateUser(credentials);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.id).toBe(user.id);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const user = {
        id: 'user-123',
        email: credentials.email,
        passwordHash: 'hashedPassword',
        status: 'active',
        failedLoginAttempts: 0,
        accountLocked: false
      };

      mockUserRepository.findByEmail.mockResolvedValue(user as any);
      mockPasswordService.verifyPassword.mockResolvedValue(false);

      // Act & Assert
      await expect(userService.authenticateUser(credentials))
        .rejects
        .toThrow('Invalid credentials');
    });

    it('should throw error for locked account', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const user = {
        id: 'user-123',
        email: credentials.email,
        accountLocked: true,
        lockoutUntil: new Date(Date.now() + 3600000) // 1 hour from now
      };

      mockUserRepository.findByEmail.mockResolvedValue(user as any);

      // Act & Assert
      await expect(userService.authenticateUser(credentials))
        .rejects
        .toThrow('Account is locked');
    });
  });
});
```

### Repository Layer Tests

```typescript
// tests/unit/repositories/user.repository.test.ts
import { UserRepository } from '../../../src/repositories/user.repository';
import { Database } from '../../../src/infrastructure/database';
import { CacheService } from '../../../src/services/cache.service';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockDatabase: jest.Mocked<Database>;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    mockDatabase = {
      query: jest.fn(),
      transaction: jest.fn()
    } as any;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn()
    } as any;

    userRepository = new UserRepository(mockDatabase, mockCacheService);
  });

  describe('findById', () => {
    it('should return user from cache if available', async () => {
      // Arrange
      const userId = 'user-123';
      const cachedUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockCacheService.get.mockResolvedValue(cachedUser);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(result).toEqual(cachedUser);
      expect(mockCacheService.get).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockDatabase.query).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      // Arrange
      const userId = 'user-123';
      const dbUser = {
        id: userId,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      mockCacheService.get.mockResolvedValue(null);
      mockDatabase.query.mockResolvedValue({ rows: [dbUser] });

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.firstName).toBe('John');
      expect(mockDatabase.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 AND status != $2',
        [userId, 'deleted']
      );
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return null if user not found', async () => {
      // Arrange
      const userId = 'nonexistent-user';

      mockCacheService.get.mockResolvedValue(null);
      mockDatabase.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should save user and invalidate cache', async () => {
      // Arrange
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockTransaction = jest.fn().mockImplementation((callback) => {
        return callback({
          query: jest.fn().mockResolvedValue({ rows: [user] })
        });
      });

      mockDatabase.transaction.mockImplementation(mockTransaction);

      // Act
      await userRepository.save(user as any);

      // Assert
      expect(mockDatabase.transaction).toHaveBeenCalled();
      expect(mockCacheService.invalidate).toHaveBeenCalledWith(`user:${user.id}*`);
    });
  });
});
```

### Utility Function Tests

```typescript
// tests/unit/utils/validation.test.ts
import { validateEmail, validatePassword, sanitizeInput } from '../../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com'
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyP@ssw0rd2024',
        'C0mpl3x!P@ssw0rd'
      ];

      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'weak',
        '12345678',
        'password',
        'PASSWORD',
        'Pass123'
      ];

      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const dangerousInputs = [
        '<script>alert("xss")</script>',
        'DROP TABLE users;',
        '../../etc/passwd'
      ];

      dangerousInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('DROP TABLE');
        expect(sanitized).not.toContain('../');
      });
    });

    it('should preserve safe content', () => {
      const safeInputs = [
        'John Doe',
        'user@example.com',
        'This is a safe description.'
      ];

      safeInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).toBe(input);
      });
    });
  });
});
```

## 🔗 Integration Testing

### API Endpoint Tests

```typescript
// tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { createTestUser } from '../helpers/fixtures';

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await cleanupTestDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for existing email', async () => {
      // Create existing user
      await createTestUser({ email: 'existing@example.com' });

      const userData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      await createTestUser({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should implement rate limiting', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
          .expect(401);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const user = await createTestUser();
      
      // Login to get tokens
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123!'
        });

      const { refreshToken } = loginResponse.body.data;

      // Refresh tokens
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });
});
```

### Database Integration Tests

```typescript
// tests/integration/database.test.ts
import { Database } from '../../src/infrastructure/database';
import { UserRepository } from '../../src/repositories/user.repository';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';

describe('Database Integration', () => {
  let database: Database;
  let userRepository: UserRepository;

  beforeAll(async () => {
    database = await setupTestDatabase();
    userRepository = new UserRepository(database, mockCacheService);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('User CRUD Operations', () => {
    it('should create and retrieve user', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Create user
      const createdUser = await userRepository.save(userData as any);
      expect(createdUser.id).toBeDefined();

      // Retrieve user
      const retrievedUser = await userRepository.findById(createdUser.id);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.email).toBe(userData.email);
    });

    it('should update user information', async () => {
      const user = await createTestUser();
      
      user.firstName = 'Updated';
      user.lastName = 'Name';
      
      await userRepository.save(user);
      
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser?.firstName).toBe('Updated');
      expect(updatedUser?.lastName).toBe('Name');
    });

    it('should soft delete user', async () => {
      const user = await createTestUser();
      
      await userRepository.delete(user.id);
      
      const deletedUser = await userRepository.findById(user.id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Database Transactions', () => {
    it('should rollback on error', async () => {
      const userData = {
        email: 'transaction-test@example.com',
        passwordHash: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe'
      };

      try {
        await database.transaction(async (trx) => {
          await userRepository.save(userData as any, trx);
          // Simulate error
          throw new Error('Simulated error');
        });
      } catch (error) {
        // Expected error
      }

      // User should not exist due to rollback
      const user = await userRepository.findByEmail(userData.email);
      expect(user).toBeNull();
    });
  });
});
```

## 🎭 End-to-End Testing

### User Journey Tests

```typescript
// tests/e2e/user-registration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Registration Journey', () => {
  test('should complete full registration flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');

    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'newuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="first-name-input"]', 'John');
    await page.fill('[data-testid="last-name-input"]', 'Doe');
    await page.check('[data-testid="terms-checkbox"]');

    // Submit form
    await page.click('[data-testid="register-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Registration successful');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]'))
      .toContainText('John Doe');
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto('/register');

    // Submit empty form
    await page.click('[data-testid="register-button"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="email-error"]'))
      .toContainText('Email is required');
    await expect(page.locator('[data-testid="password-error"]'))
      .toContainText('Password is required');
  });

  test('should handle duplicate email registration', async ({ page }) => {
    // First registration
    await page.goto('/register');
    await page.fill('[data-testid="email-input"]', 'duplicate@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="first-name-input"]', 'John');
    await page.fill('[data-testid="last-name-input"]', 'Doe');
    await page.check('[data-testid="terms-checkbox"]');
    await page.click('[data-testid="register-button"]');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Try to register with same email
    await page.goto('/register');
    await page.fill('[data-testid="email-input"]', 'duplicate@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="first-name-input"]', 'Jane');
    await page.fill('[data-testid="last-name-input"]', 'Smith');
    await page.check('[data-testid="terms-checkbox"]');
    await page.click('[data-testid="register-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Email already registered');
  });
});
```

### Authentication Flow Tests

```typescript
// tests/e2e/authentication.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Create test user
    await page.request.post('/api/test/users', {
      data: {
        email: 'testuser@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      }
    });
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]'))
      .toContainText('Welcome back, Test');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Invalid email or password');
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="forgot-password-link"]');

    await expect(page).toHaveURL('/forgot-password');

    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.click('[data-testid="reset-button"]');

    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Password reset email sent');
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');

    // Refresh page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]'))
      .toContainText('Test User');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Should not be able to access protected pages
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
```

## ⚡ Performance Testing

### Load Testing Configuration

```yaml
# artillery.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
    - duration: 60
      arrivalRate: 200
      name: "Spike test"
  payload:
    path: "./test-data/users.csv"
    fields:
      - "email"
      - "password"
      - "firstName"
      - "lastName"
  plugins:
    metrics-by-endpoint:
      useOnlyRequestNames: true

scenarios:
  - name: "User Registration"
    weight: 30
    flow:
      - post:
          url: "/auth/register"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
            firstName: "{{ firstName }}"
            lastName: "{{ lastName }}"
            acceptTerms: true
          capture:
            - json: "$.data.accessToken"
              as: "accessToken"

  - name: "User Login"
    weight: 50
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.data.accessToken"
              as: "accessToken"
            - json: "$.data.user.id"
              as: "userId"

  - name: "Get User Profile"
    weight: 20
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.data.accessToken"
              as: "accessToken"
      - get:
          url: "/users/me"
          headers:
            Authorization: "Bearer {{ accessToken }}"
```

### Performance Test Scripts

```typescript
// tests/performance/load-test.ts
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // Test user registration
  const registrationPayload = {
    email: `user${Math.random()}@example.com`,
    password: 'SecurePass123!',
    firstName: 'Load',
    lastName: 'Test',
    acceptTerms: true
  };

  const registrationResponse = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify(registrationPayload),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const registrationSuccess = check(registrationResponse, {
    'registration status is 201': (r) => r.status === 201,
    'registration response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!registrationSuccess);

  if (registrationSuccess) {
    const accessToken = registrationResponse.json('data.accessToken');

    // Test authenticated request
    const profileResponse = http.get(
      `${BASE_URL}/users/me`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      }
    );

    const profileSuccess = check(profileResponse, {
      'profile status is 200': (r) => r.status === 200,
      'profile response time < 200ms': (r) => r.timings.duration < 200,
    });

    errorRate.add(!profileSuccess);
  }

  sleep(1);
}
```

### Stress Testing

```bash
#!/bin/bash
# stress-test.sh

echo "Starting stress test..."

# Database stress test
echo "Testing database performance..."
artillery run tests/performance/database-stress.yml

# API stress test
echo "Testing API performance..."
artillery run tests/performance/api-stress.yml

# Memory stress test
echo "Testing memory usage..."
node tests/performance/memory-test.js

# Concurrent connections test
echo "Testing concurrent connections..."
artillery run tests/performance/concurrent-test.yml

echo "Stress test completed. Check reports in ./reports/"
```

## 🔒 Security Testing

### Authentication Security Tests

```typescript
// tests/security/auth-security.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import jwt from 'jsonwebtoken';

describe('Authentication Security', () => {
  describe('JWT Token Security', () => {
    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET!
      );

      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject malformed tokens', async () => {
      const malformedToken = 'invalid.token.here';

      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject tokens with invalid signature', async () => {
      const invalidToken = jwt.sign(
        { userId: 'test-user' },
        'wrong-secret'
      );

      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Rate Limiting Security', () => {
    it('should implement rate limiting on login endpoint', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send(loginData);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should implement rate limiting on registration endpoint', async () => {
      const registrationData = {
        email: 'spam@example.com',
        password: 'SecurePass123!',
        firstName: 'Spam',
        lastName: 'User',
        acceptTerms: true
      };

      // Make multiple registration requests
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/auth/register')
          .send({
            ...registrationData,
            email: `spam${i}@example.com`
          });
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...registrationData,
          email: 'spam4@example.com'
        })
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection in email field', async () => {
      const maliciousEmail = "'; DROP TABLE users; --";

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: maliciousEmail,
          password: 'password'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent XSS in user input fields', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: xssPayload,
          lastName: 'User',
          acceptTerms: true
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        'weak',
        '12345678',
        'password',
        'PASSWORD123',
        'Pass123'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            email: 'test@example.com',
            password,
            firstName: 'Test',
            lastName: 'User',
            acceptTerms: true
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      // Login to get tokens
      const user = await createTestUser();
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123!'
        });

      const { accessToken, refreshToken } = loginResponse.body.data;

      // Logout
      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Try to use tokens after logout
      await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should detect and prevent session hijacking', async () => {
      const user = await createTestUser();
      
      // Login from first "device"
      const loginResponse1 = await request(app)
        .post('/auth/login')
        .set('User-Agent', 'Device1')
        .set('X-Forwarded-For', '192.168.1.1')
        .send({
          email: user.email,
          password: 'SecurePass123!'
        });

      const { accessToken } = loginResponse1.body.data;

      // Try to use token from different "device"
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('User-Agent', 'DifferentDevice')
        .set('X-Forwarded-For', '10.0.0.1')
        .expect(401);

      expect(response.body.error.code).toBe('SUSPICIOUS_ACTIVITY');
    });
  });
});
```

### OWASP Security Tests

```typescript
// tests/security/owasp-tests.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('OWASP Security Tests', () => {
  describe('A01:2021 – Broken Access Control', () => {
    it('should prevent unauthorized access to user data', async () => {
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const user2 = await createTestUser({ email: 'user2@example.com' });

      // Login as user1
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'SecurePass123!'
        });

      const { accessToken } = loginResponse.body.data;

      // Try to access user2's data
      const response = await request(app)
        .get(`/users/${user2.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should prevent privilege escalation', async () => {
      const regularUser = await createTestUser({ role: 'user' });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: regularUser.email,
          password: 'SecurePass123!'
        });

      const { accessToken } = loginResponse.body.data;

      // Try to access admin endpoint
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('A02:2021 – Cryptographic Failures', () => {
    it('should use secure password hashing', async () => {
      const userData = {
        email: 'crypto-test@example.com',
        password: 'SecurePass123!',
        firstName: 'Crypto',
        lastName: 'Test',
        acceptTerms: true
      };

      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Verify password is not stored in plain text
      const user = await getUserFromDatabase(userData.email);
      expect(user.passwordHash).not.toBe(userData.password);
      expect(user.passwordHash).toMatch(/^\$2[aby]\$\d+\$/);
    });

    it('should enforce HTTPS in production', async () => {
      if (process.env.NODE_ENV === 'production') {
        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.headers['strict-transport-security']).toBeDefined();
      }
    });
  });

  describe('A03:2021 – Injection', () => {
    it('should prevent SQL injection attacks', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacked@evil.com'); --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: maliciousInput,
            password: 'password'
          });

        expect(response.status).toBeOneOf([400, 401]);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should prevent NoSQL injection attacks', async () => {
      const maliciousInputs = [
        { $ne: null },
        { $regex: '.*' },
        { $where: 'this.email' }
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: maliciousInput,
            password: 'password'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('A05:2021 – Security Misconfiguration', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Should not reveal whether email exists or not
      expect(response.body.error.message).toBe('Invalid credentials');
      expect(response.body.error.message).not.toContain('email not found');
      expect(response.body.error.message).not.toContain('user does not exist');
    });

    it('should set secure HTTP headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('A07:2021 – Identification and Authentication Failures', () => {
    it('should implement account lockout after failed attempts', async () => {
      const user = await createTestUser();

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            email: user.email,
            password: 'wrongpassword'
          })
          .expect(401);
      }

      // Account should be locked
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123!' // Correct password
        })
        .expect(423);

      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('should enforce session timeout', async () => {
      // This would require mocking time or using a shorter timeout for testing
      // Implementation depends on session management strategy
    });
  });
});
```

## 📊 Test Data Management

### Test Fixtures

```typescript
// tests/helpers/fixtures.ts
import { faker } from '@faker-js/faker';
import { UserRepository } from '../../src/repositories/user.repository';
import { PasswordService } from '../../src/services/password.service';

export interface TestUserData {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
}

export class TestDataFactory {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService
  ) {}

  async createUser(overrides: TestUserData = {}): Promise<any> {
    const userData = {
      email: overrides.email || faker.internet.email(),
      password: overrides.password || 'SecurePass123!',
      firstName: overrides.firstName || faker.person.firstName(),
      lastName: overrides.lastName || faker.person.lastName(),
      role: overrides.role || 'user',
      status: overrides.status || 'active'
    };

    const passwordHash = await this.passwordService.hashPassword(userData.password);

    const user = await this.userRepository.save({
      ...userData,
      passwordHash,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return { ...user, password: userData.password };
  }

  async createUsers(count: number, overrides: TestUserData = {}): Promise<any[]> {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createUser({
        ...overrides,
        email: overrides.email ? `${i}-${overrides.email}` : undefined
      });
      users.push(user);
    }
    return users;
  }

  generateUserData(overrides: TestUserData = {}): TestUserData {
    return {
      email: overrides.email || faker.internet.email(),
      password: overrides.password || 'SecurePass123!',
      firstName: overrides.firstName || faker.person.firstName(),
      lastName: overrides.lastName || faker.person.lastName(),
      role: overrides.role || 'user',
      status: overrides.status || 'active'
    };
  }

  generateInvalidUserData(): Partial<TestUserData>[] {
    return [
      { email: 'invalid-email' },
      { email: '' },
      { password: 'weak' },
      { password: '' },
      { firstName: '' },
      { lastName: '' },
      { firstName: '<script>alert("xss")</script>' },
      { email: 'test@' },
      { email: '@example.com' }
    ];
  }
}

// Helper functions
export async function createTestUser(overrides: TestUserData = {}): Promise<any> {
  const factory = new TestDataFactory(userRepository, passwordService);
  return factory.createUser(overrides);
}

export async function createTestUsers(count: number, overrides: TestUserData = {}): Promise<any[]> {
  const factory = new TestDataFactory(userRepository, passwordService);
  return factory.createUsers(count, overrides);
}

export function generateTestJWT(payload: any, secret?: string): string {
  return jwt.sign(payload, secret || process.env.JWT_SECRET!, { expiresIn: '1h' });
}

export function generateExpiredJWT(payload: any): string {
  return jwt.sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) - 3600 },
    process.env.JWT_SECRET!
  );
}
```

### Database Helpers

```typescript
// tests/helpers/database.ts
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { runMigrations } from '../../src/infrastructure/migrations';

let testDb: Pool;
let testRedis: Redis;

export async function setupTestDatabase(): Promise<void> {
  // Setup PostgreSQL test database
  testDb = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'user_service_test',
    user: process.env.DB_USER || 'test_user',
    password: process.env.DB_PASSWORD || 'test_password'
  });

  // Setup Redis test instance
  testRedis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380'),
    password: process.env.REDIS_PASSWORD || 'test_password',
    db: 1 // Use different database for tests
  });

  // Run migrations
  await runMigrations(testDb);
}

export async function cleanupTestDatabase(): Promise<void> {
  if (testDb) {
    // Clean all tables
    await testDb.query('TRUNCATE TABLE users, user_sessions, password_resets CASCADE');
  }

  if (testRedis) {
    // Clear Redis cache
    await testRedis.flushdb();
  }
}

export async function closeTestDatabase(): Promise<void> {
  if (testDb) {
    await testDb.end();
  }

  if (testRedis) {
    await testRedis.quit();
  }
}

export function getTestDatabase(): Pool {
  return testDb;
}

export function getTestRedis(): Redis {
  return testRedis;
}
```

### Test Setup and Teardown

```typescript
// tests/setup.ts
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from './helpers/database';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  await setupTestDatabase();
}, 30000);

// Global test teardown
afterAll(async () => {
  await closeTestDatabase();
}, 10000);

// Clean database before each test
beforeEach(async () => {
  await cleanupTestDatabase();
});

// Global test configuration
jest.setTimeout(30000);

// Mock external services
jest.mock('../src/services/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true)
  }))
}));

// Suppress console logs during tests
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}
```

## 🔄 Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: user_service_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run type checking
      run: npm run type-check

    - name: Run unit tests
      run: npm run test:unit
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: user_service_test
        DB_USER: test_user
        DB_PASSWORD: test_password
        REDIS_HOST: localhost
        REDIS_PORT: 6379
        JWT_SECRET: test_jwt_secret_key_for_testing_only
        JWT_REFRESH_SECRET: test_refresh_secret_key_for_testing_only

    - name: Run integration tests
      run: npm run test:integration
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: user_service_test
        DB_USER: test_user
        DB_PASSWORD: test_password
        REDIS_HOST: localhost
        REDIS_PORT: 6379
        JWT_SECRET: test_jwt_secret_key_for_testing_only
        JWT_REFRESH_SECRET: test_refresh_secret_key_for_testing_only

    - name: Run security tests
      run: npm run test:security

    - name: Generate coverage report
      run: npm run test:coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

  e2e-test:
    runs-on: ubuntu-latest
    needs: test

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright
      run: npx playwright install

    - name: Start application
      run: |
        npm run build
        npm run start:test &
        sleep 30

    - name: Run E2E tests
      run: npm run test:e2e

    - name: Upload E2E test results
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/

  performance-test:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Install Artillery
      run: npm install -g artillery

    - name: Start application
      run: |
        npm run build
        npm run start:test &
        sleep 30

    - name: Run performance tests
      run: npm run test:performance

    - name: Upload performance results
      uses: actions/upload-artifact@v3
      with:
        name: performance-report
        path: reports/
```

### Package.json Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "playwright test",
    "test:security": "jest --testPathPattern=tests/security",
    "test:performance": "artillery run tests/performance/load-test.yml",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "lint": "eslint src tests --ext .ts",
    "lint:fix": "eslint src tests --ext .ts --fix",
    "type-check": "tsc --noEmit"
  }
}
```

## 📈 Test Reporting

### Coverage Reports

```typescript
// jest.config.js - Coverage configuration
module.exports = {
  // ... other config
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/config/**',
    '!src/migrations/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/controllers/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
};
```

### Custom Test Reporter

```typescript
// tests/reporters/custom-reporter.ts
import { Reporter, Test, TestResult } from '@jest/reporters';
import fs from 'fs';
import path from 'path';

class CustomTestReporter implements Reporter {
  private results: any[] = [];

  onTestResult(test: Test, testResult: TestResult): void {
    this.results.push({
      testFilePath: test.path,
      success: testResult.numFailingTests === 0,
      duration: testResult.perfStats.end - testResult.perfStats.start,
      numTests: testResult.numPassingTests + testResult.numFailingTests,
      numPassing: testResult.numPassingTests,
      numFailing: testResult.numFailingTests,
      failures: testResult.testResults
        .filter(result => result.status === 'failed')
        .map(result => ({
          title: result.title,
          message: result.failureMessages.join('\n')
        }))
    });
  }

  onRunComplete(): void {
    const reportPath = path.join(process.cwd(), 'reports', 'test-results.json');
    
    // Ensure reports directory exists
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    
    // Write detailed test report
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.reduce((sum, r) => sum + r.numTests, 0),
        totalPassing: this.results.reduce((sum, r) => sum + r.numPassing, 0),
        totalFailing: this.results.reduce((sum, r) => sum + r.numFailing, 0),
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0)
      },
      results: this.results
    }, null, 2));

    console.log(`\n📊 Test report generated: ${reportPath}`);
  }
}

export default CustomTestReporter;
```

## 🎯 Best Practices

### Test Organization

1. **File Structure**
   ```
   tests/
   ├── unit/
   │   ├── services/
   │   ├── repositories/
   │   ├── controllers/
   │   └── utils/
   ├── integration/
   │   ├── api/
   │   ├── database/
   │   └── external-services/
   ├── e2e/
   │   ├── user-journeys/
   │   └── critical-paths/
   ├── performance/
   ├── security/
   ├── helpers/
   └── fixtures/
   ```

2. **Naming Conventions**
   - Test files: `*.test.ts` or `*.spec.ts`
   - Test suites: Descriptive names matching the component being tested
   - Test cases: Should describe the expected behavior

3. **Test Structure (AAA Pattern)**
   ```typescript
   it('should do something when condition is met', async () => {
     // Arrange
     const input = 'test data';
     const expected = 'expected result';
     
     // Act
     const result = await functionUnderTest(input);
     
     // Assert
     expect(result).toBe(expected);
   });
   ```

### Writing Effective Tests

1. **Test Independence**
   - Each test should be independent
   - Use proper setup and teardown
   - Avoid shared state between tests

2. **Clear Test Names**
   ```typescript
   // Good
   it('should return 401 when user provides invalid credentials')
   
   // Bad
   it('should test login')
   ```

3. **Test Edge Cases**
   - Boundary conditions
   - Error scenarios
   - Invalid inputs
   - Network failures

4. **Mock External Dependencies**
   ```typescript
   // Mock external services
   jest.mock('../services/email.service');
   
   // Mock database calls
   const mockUserRepository = {
     findById: jest.fn(),
     save: jest.fn()
   };
   ```

### Performance Testing Guidelines

1. **Realistic Load Patterns**
   - Model actual user behavior
   - Include think time between requests
   - Test different user types

2. **Gradual Load Increase**
   - Start with baseline load
   - Gradually increase to target load
   - Include spike testing

3. **Monitor Key Metrics**
   - Response time percentiles
   - Error rates
   - Resource utilization
   - Database performance

### Security Testing Best Practices

1. **Input Validation Testing**
   - Test all input fields
   - Include boundary values
   - Test with malicious payloads

2. **Authentication Testing**
   - Test token expiration
   - Test session management
   - Test privilege escalation

3. **Authorization Testing**
   - Test access controls
   - Test role-based permissions
   - Test data isolation

## 🔧 Troubleshooting

### Common Test Issues

1. **Flaky Tests**
   ```typescript
   // Problem: Race conditions
   it('should update user', async () => {
     await userService.updateUser(userId, data);
     const user = await userService.getUser(userId); // May not be updated yet
     expect(user.name).toBe(data.name);
   });
   
   // Solution: Proper async handling
   it('should update user', async () => {
     await userService.updateUser(userId, data);
     await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async operations
     const user = await userService.getUser(userId);
     expect(user.name).toBe(data.name);
   });
   ```

2. **Database Connection Issues**
   ```bash
   # Check if test database is running
   docker ps | grep postgres
   
   # Check database connectivity
   psql -h localhost -p 5433 -U test_user -d user_service_test
   
   # Reset test database
   npm run db:reset:test
   ```

3. **Memory Leaks in Tests**
   ```typescript
   // Problem: Not cleaning up resources
   afterEach(() => {
     // Clean up mocks
     jest.clearAllMocks();
     
     // Close database connections
     database.close();
     
     // Clear timers
     jest.clearAllTimers();
   });
   ```

### Debugging Test Failures

1. **Enable Debug Logging**
   ```bash
   DEBUG=* npm test
   LOG_LEVEL=debug npm test
   ```

2. **Run Single Test**
   ```bash
   npm test -- --testNamePattern="should register user"
   npm test -- tests/unit/services/user.service.test.ts
   ```

3. **Debug with Node Inspector**
   ```bash
   npm run test:debug
   # Then open chrome://inspect in Chrome
   ```

### Performance Test Troubleshooting

1. **High Response Times**
   - Check database query performance
   - Monitor CPU and memory usage
   - Check for N+1 query problems
   - Review caching strategy

2. **High Error Rates**
   - Check application logs
   - Monitor database connections
   - Review rate limiting configuration
   - Check external service dependencies

3. **Resource Exhaustion**
   - Monitor memory usage
   - Check for memory leaks
   - Review connection pooling
   - Monitor file descriptors

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Artillery Documentation](https://artillery.io/docs/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-15  
**Next Review**: 2024-04-15