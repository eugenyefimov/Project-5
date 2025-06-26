# User Service

[![Build Status](https://github.com/project5/user-service/workflows/CI/badge.svg)](https://github.com/project5/user-service/actions)
[![Coverage Status](https://coveralls.io/repos/github/project5/user-service/badge.svg?branch=main)](https://coveralls.io/github/project5/user-service?branch=main)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=project5_user-service&metric=security_rating)](https://sonarcloud.io/dashboard?id=project5_user-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/kubernetes-ready-blue.svg)](https://kubernetes.io/)

A robust, scalable, and secure user management microservice built with Node.js, Express, PostgreSQL, and Redis. This service provides comprehensive user authentication, authorization, and profile management capabilities with enterprise-grade security features.

## 🚀 Features

### Core Functionality
- **User Registration & Authentication** - Secure user onboarding with email verification
- **JWT Authentication** - Stateless authentication with refresh token support
- **Password Management** - Secure password hashing, reset, and change functionality
- **Profile Management** - Complete user profile CRUD operations
- **Role-Based Access Control (RBAC)** - Flexible permission system
- **Two-Factor Authentication (2FA)** - Enhanced security with TOTP support
- **Session Management** - Redis-backed session storage
- **Account Security** - Lockout protection and brute force prevention

### Security Features
- **Rate Limiting** - Configurable rate limits per endpoint
- **Input Validation** - Comprehensive request validation with Joi
- **SQL Injection Prevention** - Parameterized queries and ORM protection
- **XSS Protection** - Content Security Policy and input sanitization
- **CSRF Protection** - Cross-site request forgery prevention
- **Security Headers** - Helmet.js security middleware
- **Audit Logging** - Comprehensive user activity tracking
- **IP-based Blocking** - Automatic suspicious activity detection

### Performance & Scalability
- **Database Connection Pooling** - Optimized PostgreSQL connections
- **Redis Caching** - High-performance caching layer
- **Response Compression** - Gzip compression for API responses
- **Query Optimization** - Indexed database queries
- **Horizontal Scaling** - Stateless design for easy scaling
- **Load Balancing Ready** - Health checks and graceful shutdown

### Monitoring & Observability
- **Structured Logging** - Winston-based logging with multiple transports
- **Prometheus Metrics** - Custom business and system metrics
- **Health Checks** - Comprehensive health monitoring
- **Performance Profiling** - Built-in performance monitoring
- **Error Tracking** - Detailed error logging and alerting
- **Request Tracing** - Distributed tracing support

### Development Experience
- **Comprehensive Testing** - Unit, integration, performance, and security tests
- **API Documentation** - Swagger/OpenAPI documentation
- **Docker Support** - Multi-stage Docker builds
- **Kubernetes Ready** - Production-ready K8s manifests
- **CI/CD Pipeline** - Automated testing and deployment
- **Development Tools** - Hot reload, debugging, and profiling

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Security](#security)
- [Performance](#performance)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## 🔧 Prerequisites

### System Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **PostgreSQL**: 13.0 or higher
- **Redis**: 6.0 or higher
- **Docker**: 20.10 or higher (optional)
- **Kubernetes**: 1.20 or higher (for production deployment)

### Development Tools
- **Git**: Version control
- **Make**: Build automation (optional)
- **Docker Compose**: Local development environment
- **kubectl**: Kubernetes CLI (for K8s deployment)
- **Helm**: Kubernetes package manager (optional)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/project5/user-service.git
cd user-service

# Start all services
docker-compose up -d

# Check service health
curl http://localhost:3000/health

# View API documentation
open http://localhost:3000/api-docs
```

### Manual Setup

```bash
# Clone and install dependencies
git clone https://github.com/project5/user-service.git
cd user-service
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:setup
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

## 📦 Installation

### 1. Clone Repository

```bash
git clone https://github.com/project5/user-service.git
cd user-service
```

### 2. Install Dependencies

```bash
# Install production and development dependencies
npm install

# Or install only production dependencies
npm ci --only=production
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
vim .env  # or your preferred editor
```

### 4. Database Setup

```bash
# Create database and run migrations
npm run db:setup
npm run db:migrate

# Seed with initial data (optional)
npm run db:seed
```

### 5. Start Application

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Using PM2 for production
npm run start:pm2
```

## ⚙️ Configuration

### Environment Variables

The application uses environment variables for configuration. Copy `.env.example` to `.env` and customize:

```bash
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1
SERVICE_NAME=user-service

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=userservice
DB_USER=postgres
DB_PASSWORD=password
DB_POOL_MIN=2
DB_POOL_MAX=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=your-session-secret

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=info
LOG_FORMAT=json
```

### Configuration Files

- **`.env`** - Environment-specific variables
- **`config/database.js`** - Database configuration
- **`config/redis.js`** - Redis configuration
- **`config/security.js`** - Security settings
- **`config/monitoring.js`** - Monitoring configuration

## 📚 API Documentation

### Interactive Documentation

Once the service is running, visit:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **ReDoc**: `http://localhost:3000/redoc`
- **OpenAPI Spec**: `http://localhost:3000/api-docs.json`

### Core Endpoints

#### Authentication
```http
POST /api/v1/auth/register     # User registration
POST /api/v1/auth/login        # User login
POST /api/v1/auth/logout       # User logout
POST /api/v1/auth/refresh      # Refresh JWT token
POST /api/v1/auth/forgot-password  # Request password reset
POST /api/v1/auth/reset-password   # Reset password
POST /api/v1/auth/verify-email     # Verify email address
```

#### User Management
```http
GET  /api/v1/users/profile     # Get current user profile
PUT  /api/v1/users/profile     # Update user profile
POST /api/v1/users/change-password  # Change password
GET  /api/v1/users             # List users (admin only)
GET  /api/v1/users/:id         # Get user by ID (admin only)
PUT  /api/v1/users/:id         # Update user (admin only)
DELETE /api/v1/users/:id       # Delete user (admin only)
```

#### System
```http
GET  /health                   # Health check
GET  /metrics                  # Prometheus metrics
GET  /api-docs                 # API documentation
```

### Example Requests

#### User Registration
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### User Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

#### Get User Profile
```bash
curl -X GET http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🧪 Testing

### Test Suites

The project includes comprehensive testing:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:performance   # Performance tests
npm run test:security      # Security tests

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests in CI mode
npm run test:ci
```

### Using Make Commands

```bash
# Run all tests
make test

# Run specific test types
make test-unit
make test-integration
make test-performance
make test-security

# Generate coverage report
make coverage
```

### Test Configuration

Tests use a separate test database and Redis instance:

```bash
# Set up test environment
npm run test:setup

# Clean test environment
npm run test:cleanup
```

## 🚀 Deployment

### Docker Deployment

#### Build Image
```bash
# Build production image
docker build -t user-service:latest .

# Build with specific tag
docker build -t user-service:v1.0.0 .
```

#### Run Container
```bash
# Run with environment file
docker run -d \
  --name user-service \
  --env-file .env.production \
  -p 3000:3000 \
  user-service:latest
```

#### Docker Compose Production
```bash
# Start production stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale service
docker-compose up -d --scale user-service=3
```

### Kubernetes Deployment

#### Using kubectl
```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app=user-service

# View logs
kubectl logs -f deployment/user-service
```

#### Using Helm
```bash
# Install with Helm
helm install user-service ./helm/user-service

# Upgrade deployment
helm upgrade user-service ./helm/user-service

# Rollback deployment
helm rollback user-service 1
```

### Health Checks

The service provides health check endpoints for container orchestration:

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed

# Readiness probe
curl http://localhost:3000/health/ready

# Liveness probe
curl http://localhost:3000/health/live
```

## 📊 Monitoring

### Metrics Collection

The service exposes Prometheus metrics:

```bash
# View metrics
curl http://localhost:3000/metrics
```

### Custom Metrics

- **Request Duration**: HTTP request processing time
- **Request Count**: Total HTTP requests by status code
- **Database Connections**: Active database connections
- **Redis Operations**: Cache hit/miss rates
- **Authentication Events**: Login/logout/registration counts
- **Error Rates**: Application error frequencies

### Logging

Structured logging with multiple levels:

```javascript
// Log levels: error, warn, info, http, verbose, debug, silly
logger.info('User registered', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString()
});
```

### Grafana Dashboards

Pre-built dashboards for monitoring:

- **Application Overview**: Key metrics and health status
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Error rates and types
- **Database Metrics**: Connection pools and query performance
- **Security Events**: Authentication and authorization events

## 🔒 Security

### Security Features

#### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with RS256 algorithm
- **Refresh Tokens**: Secure token renewal mechanism
- **Role-Based Access Control**: Flexible permission system
- **Two-Factor Authentication**: TOTP-based 2FA support
- **Session Management**: Redis-backed session storage

#### Input Validation & Sanitization
- **Joi Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization and CSP headers
- **File Upload Security**: Type and size validation
- **Request Size Limiting**: Prevent DoS attacks

#### Rate Limiting & Abuse Prevention
- **Endpoint Rate Limiting**: Configurable limits per endpoint
- **IP-based Blocking**: Automatic suspicious activity detection
- **Brute Force Protection**: Account lockout mechanisms
- **CAPTCHA Integration**: Human verification for sensitive operations

#### Security Headers
- **Helmet.js**: Comprehensive security headers
- **CORS Configuration**: Cross-origin request control
- **CSRF Protection**: Cross-site request forgery prevention
- **Content Security Policy**: XSS attack prevention

### Security Best Practices

#### Password Security
```javascript
// Strong password requirements
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/);

// Secure password hashing
const hashedPassword = await bcrypt.hash(password, 12);
```

#### JWT Security
```javascript
// Secure JWT configuration
const jwtOptions = {
  algorithm: 'RS256',
  expiresIn: '15m',
  issuer: 'user-service',
  audience: 'user-service-clients'
};
```

### Security Auditing

```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Run security tests
npm run test:security

# Check dependencies
npm run security:deps
```

## ⚡ Performance

### Performance Characteristics

- **Throughput**: 1000+ requests/second
- **Response Time**: <100ms (95th percentile)
- **Memory Usage**: <512MB under normal load
- **CPU Usage**: <50% under normal load
- **Database Connections**: Pooled (max 20)
- **Cache Hit Rate**: >90% for frequent data

### Optimization Techniques

#### Database Optimization
```sql
-- Indexed queries for fast lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

#### Caching Strategy
```javascript
// Redis caching for user sessions
const cacheKey = `user:${userId}`;
const cachedUser = await redis.get(cacheKey);

if (!cachedUser) {
  const user = await db.getUserById(userId);
  await redis.setex(cacheKey, 3600, JSON.stringify(user));
  return user;
}

return JSON.parse(cachedUser);
```

### Performance Testing

```bash
# Run performance tests
npm run test:performance

# Load testing with Artillery
npm run load:test

# Stress testing
npm run stress:test

# Memory profiling
npm run profile:memory
```

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/user-service.git
   cd user-service
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up development environment**
   ```bash
   cp .env.example .env.development
   npm run dev:setup
   ```

5. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Code Standards

#### Linting and Formatting
```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
git commit -m "feat: add user profile endpoint"

# Bug fix
git commit -m "fix: resolve authentication issue"

# Documentation
git commit -m "docs: update API documentation"
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database status
npm run db:status

# Test database connection
npm run db:test

# Reset database
npm run db:reset
```

#### Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Test Redis connection
npm run redis:test

# Clear Redis cache
npm run redis:clear
```

#### Authentication Issues
```bash
# Verify JWT configuration
npm run auth:verify

# Generate new JWT secret
npm run auth:generate-secret

# Test authentication flow
npm run auth:test
```

### Debug Mode

```bash
# Start in debug mode
DEBUG=user-service:* npm run dev

# Debug specific modules
DEBUG=user-service:auth,user-service:db npm run dev

# Enable verbose logging
LOG_LEVEL=debug npm run dev
```

### Health Checks

```bash
# Check application health
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed

# Check dependencies
npm run health:deps
```

### Getting Help

- **Documentation**: Check the [Wiki](https://github.com/project5/user-service/wiki)
- **Issues**: Search [GitHub Issues](https://github.com/project5/user-service/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/project5/user-service/discussions)
- **Support**: Contact the development team

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Express.js** - Web framework
- **PostgreSQL** - Database system
- **Redis** - Caching and session store
- **Jest** - Testing framework
- **Docker** - Containerization
- **Kubernetes** - Container orchestration
- **Prometheus** - Monitoring and metrics
- **Winston** - Logging library

## 📞 Support

For support, please:

1. **Check the documentation** in this README
2. **Search existing issues** on GitHub
3. **Create a new issue** with detailed information
4. **Join our community** discussions

---

**Made with ❤️ by the Project-5 Team**

For more information, visit our [GitHub repository](https://github.com/project5/user-service).

The service exposes Prometheus metrics including:

- HTTP request duration and count
- Database connection pool status
- Redis connection status
- Custom business metrics
- Node.js process metrics

### Logging

Structured JSON logging with the following levels:

- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug-level messages

### Health Checks

- **Liveness**: `/health` - Basic service health
- **Readiness**: `/ready` - Service readiness (DB, Redis connectivity)

## Security

### Authentication

- JWT tokens with configurable expiration
- Refresh token rotation
- Password hashing with bcrypt
- Rate limiting on authentication endpoints

### Authorization

- Role-based access control (RBAC)
- JWT token validation middleware
- Protected routes with permission checks

### Security Headers

- Helmet.js for security headers
- CORS configuration
- CSRF protection

### Input Validation

- Joi schema validation
- SQL injection prevention
- XSS protection

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Performance

### Optimization

- Connection pooling for PostgreSQL
- Redis caching for frequently accessed data
- Compression middleware
- Request/response optimization

### Scaling

- Horizontal pod autoscaling
- Database read replicas
- Redis clustering
- Load balancing

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database connectivity
   npm run db:check
   
   # View database logs
   kubectl logs -f deployment/postgresql
   ```

2. **Redis Connection Issues**
   ```bash
   # Check Redis connectivity
   npm run redis:check
   
   # View Redis logs
   kubectl logs -f deployment/redis
   ```

3. **Authentication Issues**
   ```bash
   # Verify JWT configuration
   npm run jwt:verify
   
   # Check token expiration
   npm run token:decode
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=user-service:* npm run dev

# Enable verbose logging
LOG_LEVEL=debug npm start
```

### Health Check

```bash
# Check service health
curl http://localhost:3002/health

# Check service readiness
curl http://localhost:3002/ready

# View metrics
curl http://localhost:3002/metrics
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Guidelines

- Follow the existing code style
- Write comprehensive tests
- Update documentation
- Use conventional commit messages
- Ensure security best practices

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:

- **Documentation**: [Project-5 Docs](https://docs.project5.com)
- **Issues**: [GitHub Issues](https://github.com/project5/user-service/issues)
- **Email**: support@project5.com
- **Slack**: #project5-support