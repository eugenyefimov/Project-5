# User Service API Documentation

## 📋 Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [User Management](#user-management-endpoints)
  - [Profile Management](#profile-management-endpoints)
  - [Security](#security-endpoints)
  - [Health & Monitoring](#health--monitoring-endpoints)
- [Data Models](#data-models)
- [Examples](#examples)
- [SDKs](#sdks)

## 🌐 Overview

The User Service API provides comprehensive user management functionality including authentication, authorization, profile management, and security features. This RESTful API follows OpenAPI 3.0 specification and supports JSON data format.

### Features

- **User Registration & Authentication**: Secure user onboarding and login
- **JWT Token Management**: Access and refresh token handling
- **Profile Management**: User profile CRUD operations
- **Role-Based Access Control**: Granular permission system
- **Two-Factor Authentication**: TOTP and backup codes
- **Security Features**: Rate limiting, account lockout, audit logging
- **Health Monitoring**: Service health and metrics endpoints

## 🔗 Base URL

```
Development: http://localhost:3000/api/v1
Staging: https://staging-api.project5.com/user-service/api/v1
Production: https://api.project5.com/user-service/api/v1
```

## 🔐 Authentication

### Bearer Token Authentication

Most endpoints require authentication using JWT Bearer tokens:

```http
Authorization: Bearer <your_jwt_token>
```

### Token Types

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

### Token Refresh

When an access token expires, use the refresh token to obtain a new one:

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

## ⚡ Rate Limiting

### Global Limits

- **General API**: 1000 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **Password Reset**: 3 requests per hour per email

### Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## ❌ Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req_123456789"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `AUTHENTICATION_FAILED` | Invalid credentials |
| `TOKEN_EXPIRED` | JWT token has expired |
| `TOKEN_INVALID` | JWT token is invalid |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `USER_NOT_FOUND` | User does not exist |
| `EMAIL_ALREADY_EXISTS` | Email is already registered |
| `ACCOUNT_LOCKED` | Account is temporarily locked |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## 🔗 API Endpoints

### Authentication Endpoints

#### Register User

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "acceptTerms": true
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": false,
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

#### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "lastLoginAt": "2024-01-01T12:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

#### Logout

```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

#### Refresh Token

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

#### Forgot Password

```http
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Password reset email sent"
}
```

#### Reset Password

```http
POST /auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_here",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Password successfully reset"
}
```

### User Management Endpoints

#### Get Current User

```http
GET /users/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "emailVerified": true,
    "twoFactorEnabled": false,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z",
    "lastLoginAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Update Current User

```http
PUT /users/me
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Software developer",
  "timezone": "America/New_York"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "bio": "Software developer",
    "timezone": "America/New_York",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Change Password

```http
PUT /users/me/password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response (200):**
```json
{
  "message": "Password successfully changed"
}
```

#### Delete Account

```http
DELETE /users/me
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "password": "CurrentPassword123!",
  "confirmation": "DELETE"
}
```

**Response (200):**
```json
{
  "message": "Account successfully deleted"
}
```

### Profile Management Endpoints

#### Get User Profile

```http
GET /users/:userId/profile
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "profile": {
    "userId": "user_123",
    "displayName": "John Doe",
    "bio": "Software developer",
    "avatar": "https://example.com/avatar.jpg",
    "website": "https://johndoe.com",
    "location": "New York, NY",
    "socialLinks": {
      "twitter": "@johndoe",
      "linkedin": "johndoe",
      "github": "johndoe"
    },
    "preferences": {
      "theme": "dark",
      "language": "en",
      "timezone": "America/New_York",
      "notifications": {
        "email": true,
        "push": false,
        "sms": false
      }
    }
  }
}
```

#### Update User Profile

```http
PUT /users/me/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "displayName": "John Doe",
  "bio": "Full-stack developer",
  "website": "https://johndoe.dev",
  "location": "San Francisco, CA"
}
```

### Security Endpoints

#### Enable Two-Factor Authentication

```http
POST /users/me/2fa/enable
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "secret": "JBSWY3DPEHPK3PXP",
  "backupCodes": [
    "12345678",
    "87654321",
    "11111111",
    "22222222",
    "33333333"
  ]
}
```

#### Verify Two-Factor Authentication

```http
POST /users/me/2fa/verify
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response (200):**
```json
{
  "message": "Two-factor authentication enabled successfully",
  "backupCodes": [
    "12345678",
    "87654321",
    "11111111",
    "22222222",
    "33333333"
  ]
}
```

#### Disable Two-Factor Authentication

```http
POST /users/me/2fa/disable
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "password": "CurrentPassword123!",
  "token": "123456"
}
```

**Response (200):**
```json
{
  "message": "Two-factor authentication disabled successfully"
}
```

#### Get Active Sessions

```http
GET /users/me/sessions
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "session_123",
      "deviceInfo": {
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
        "browser": "Chrome",
        "os": "Windows",
        "device": "Desktop"
      },
      "ipAddress": "192.168.1.100",
      "location": "New York, NY, US",
      "current": true,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "lastActiveAt": "2024-01-01T12:30:00.000Z"
    }
  ]
}
```

#### Revoke Session

```http
DELETE /users/me/sessions/:sessionId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Session revoked successfully"
}
```

### Health & Monitoring Endpoints

#### Health Check

```http
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2
    },
    "memory": {
      "status": "healthy",
      "usage": 45.2
    }
  }
}
```

#### Metrics

```http
GET /metrics
```

**Response (200):**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
http_requests_total{method="POST",status="201"} 567

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 100
http_request_duration_seconds_bucket{le="0.5"} 200
http_request_duration_seconds_bucket{le="1.0"} 300
```

## 📊 Data Models

### User Model

```json
{
  "id": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "user|admin|moderator",
  "emailVerified": "boolean",
  "twoFactorEnabled": "boolean",
  "accountLocked": "boolean",
  "lastLoginAt": "string (ISO 8601)",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

### Profile Model

```json
{
  "userId": "string",
  "displayName": "string",
  "bio": "string",
  "avatar": "string (URL)",
  "website": "string (URL)",
  "location": "string",
  "socialLinks": {
    "twitter": "string",
    "linkedin": "string",
    "github": "string"
  },
  "preferences": {
    "theme": "light|dark|auto",
    "language": "string",
    "timezone": "string",
    "notifications": {
      "email": "boolean",
      "push": "boolean",
      "sms": "boolean"
    }
  }
}
```

### Token Model

```json
{
  "accessToken": "string (JWT)",
  "refreshToken": "string (JWT)",
  "tokenType": "Bearer",
  "expiresIn": "number (seconds)"
}
```

## 📝 Examples

### Complete User Registration Flow

```javascript
// 1. Register user
const registerResponse = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe',
    acceptTerms: true
  })
});

const { user, tokens } = await registerResponse.json();

// 2. Store tokens
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);

// 3. Make authenticated request
const profileResponse = await fetch('/api/v1/users/me', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`
  }
});

const { user: currentUser } = await profileResponse.json();
```

### Token Refresh Implementation

```javascript
class ApiClient {
  constructor() {
    this.baseURL = '/api/v1';
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (this.accessToken) {
      config.headers.Authorization = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, config);

    // Handle token expiration
    if (response.status === 401 && this.refreshToken) {
      const newTokens = await this.refreshTokens();
      if (newTokens) {
        config.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        response = await fetch(url, config);
      }
    }

    return response;
  }

  async refreshTokens() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });

      if (response.ok) {
        const { tokens } = await response.json();
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        return tokens;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
    }
    return null;
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
}
```

## 🛠️ SDKs

### JavaScript/TypeScript SDK

```bash
npm install @project5/user-service-sdk
```

```javascript
import { UserServiceClient } from '@project5/user-service-sdk';

const client = new UserServiceClient({
  baseURL: 'https://api.project5.com/user-service/api/v1',
  apiKey: 'your-api-key'
});

// Register user
const user = await client.auth.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  firstName: 'John',
  lastName: 'Doe'
});

// Login
const session = await client.auth.login({
  email: 'user@example.com',
  password: 'SecurePassword123!'
});

// Get current user
const currentUser = await client.users.getCurrentUser();
```

### Python SDK

```bash
pip install project5-user-service
```

```python
from project5_user_service import UserServiceClient

client = UserServiceClient(
    base_url='https://api.project5.com/user-service/api/v1',
    api_key='your-api-key'
)

# Register user
user = client.auth.register(
    email='user@example.com',
    password='SecurePassword123!',
    first_name='John',
    last_name='Doe'
)

# Login
session = client.auth.login(
    email='user@example.com',
    password='SecurePassword123!'
)

# Get current user
current_user = client.users.get_current_user()
```

---

**For more information, visit our [Developer Portal](https://developers.project5.com) or contact our [Support Team](mailto:api-support@project5.com).**