# Contributing to User Service

We love your input! We want to make contributing to the User Service as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Process](#development-process)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@project5.com](mailto:conduct@project5.com).

## 🔄 Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### We Use [GitHub Flow](https://guides.github.com/introduction/flow/index.html)

Pull requests are the best way to propose changes to the codebase:

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Git**: Latest version
- **Docker**: 20.10 or higher (optional but recommended)
- **PostgreSQL**: 13.0 or higher (or use Docker)
- **Redis**: 6.0 or higher (or use Docker)

### Finding Issues to Work On

- Check the [Issues](https://github.com/project5/user-service/issues) page
- Look for issues labeled `good first issue` for beginners
- Look for issues labeled `help wanted` for more experienced contributors
- Check the [Project Board](https://github.com/project5/user-service/projects) for planned work

## 🛠️ Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/user-service.git
cd user-service

# Add the original repository as upstream
git remote add upstream https://github.com/project5/user-service.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Install Git hooks for code quality
npm run prepare
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env.development

# Edit the environment file with your local settings
vim .env.development
```

### 4. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis using Docker Compose
docker-compose up -d postgres redis

# Run database migrations
npm run db:migrate

# Seed the database with test data
npm run db:seed
```

#### Option B: Local Installation

```bash
# Create database
createdb userservice_dev

# Run migrations
npm run db:migrate

# Seed the database
npm run db:seed
```

### 5. Verify Setup

```bash
# Run tests to verify everything is working
npm test

# Start the development server
npm run dev

# In another terminal, test the health endpoint
curl http://localhost:3000/health
```

## 🔧 Making Changes

### 1. Create a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 2. Development Workflow

```bash
# Start development server with hot reload
npm run dev

# In another terminal, run tests in watch mode
npm run test:watch

# Run linter to check code style
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format
```

### 3. Keep Your Branch Updated

```bash
# Regularly sync with upstream
git fetch upstream
git rebase upstream/main
```

## 🧪 Testing

### Test Requirements

- **Unit Tests**: All new functions and methods must have unit tests
- **Integration Tests**: All new API endpoints must have integration tests
- **Security Tests**: Security-related changes must include security tests
- **Performance Tests**: Performance-critical changes should include performance tests
- **Coverage**: Maintain minimum 80% test coverage

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:security
npm run test:performance

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch

# Run tests in CI mode
npm run test:ci
```

### Writing Tests

#### Unit Test Example

```javascript
// src/tests/unit/utils/validation.test.js
const { validateEmail } = require('../../../utils/validation');

describe('Email Validation', () => {
  it('should validate correct email format', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject invalid email format', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

#### Integration Test Example

```javascript
// src/tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../app');
const { testUtils } = require('../testUtils');

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    await testUtils.cleanDatabase();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
    });
  });
});
```

## 🎨 Code Style

### ESLint Configuration

We use ESLint with a custom configuration. The linter will run automatically on commit.

```bash
# Check code style
npm run lint

# Fix issues automatically
npm run lint:fix
```

### Prettier Configuration

We use Prettier for code formatting:

```bash
# Format code
npm run format

# Check if code is formatted
npm run format:check
```

### Code Style Guidelines

#### JavaScript/Node.js

- Use **ES6+** features where appropriate
- Use **async/await** instead of callbacks or raw promises
- Use **const** for constants, **let** for variables
- Use **destructuring** for object and array assignments
- Use **template literals** for string interpolation
- Use **arrow functions** for short functions
- Use **meaningful variable names**

#### Example Code Style

```javascript
// Good
const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  } catch (error) {
    logger.error('Error fetching user', { userId, error: error.message });
    throw error;
  }
};

// Bad
function getUserById(userId, callback) {
  User.findById(userId, function(err, user) {
    if (err) {
      console.log(err);
      return callback(err);
    }
    if (!user) {
      return callback(new Error('User not found'));
    }
    callback(null, user);
  });
}
```

#### Error Handling

```javascript
// Use custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

// Proper error handling in async functions
const createUser = async (userData) => {
  try {
    const validatedData = await validateUserData(userData);
    const user = await User.create(validatedData);
    logger.info('User created successfully', { userId: user.id });
    return user;
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      throw new ValidationError('Email already exists', 'email');
    }
    logger.error('Error creating user', { error: error.message, userData });
    throw error;
  }
};
```

#### Logging

```javascript
// Use structured logging
logger.info('User login attempt', {
  email: user.email,
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString()
});

// Log errors with context
logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  database: config.database.name,
  host: config.database.host
});
```

## 📝 Commit Guidelines

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools
- **ci**: Changes to CI configuration files and scripts
- **build**: Changes that affect the build system or external dependencies

### Examples

```bash
# Feature
git commit -m "feat(auth): add two-factor authentication support"

# Bug fix
git commit -m "fix(validation): resolve email validation regex issue"

# Documentation
git commit -m "docs(api): update authentication endpoint documentation"

# Refactor
git commit -m "refactor(database): optimize user query performance"

# Test
git commit -m "test(auth): add integration tests for login endpoint"

# Breaking change
git commit -m "feat(api): change user registration response format

BREAKING CHANGE: user registration now returns user object instead of user ID"
```

### Commit Best Practices

- **Keep commits atomic**: One logical change per commit
- **Write clear commit messages**: Explain what and why, not how
- **Use imperative mood**: "Add feature" not "Added feature"
- **Reference issues**: Include issue numbers when applicable
- **Keep lines under 72 characters**: For better readability

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure all tests pass**:
   ```bash
   npm test
   ```

2. **Check code style**:
   ```bash
   npm run lint
   npm run format:check
   ```

3. **Update documentation** if needed

4. **Add tests** for new functionality

5. **Update CHANGELOG.md** if applicable

### Pull Request Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Related Issues
Fixes #(issue number)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security tests pass (if applicable)
- [ ] Performance tests pass (if applicable)
- [ ] Manual testing completed

## Documentation
- [ ] Code is self-documenting
- [ ] API documentation updated (if applicable)
- [ ] README updated (if applicable)
- [ ] CHANGELOG updated (if applicable)

## Security
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] Authentication/authorization considered
- [ ] Security tests added (if applicable)

## Performance
- [ ] Performance impact considered
- [ ] Database queries optimized
- [ ] Caching implemented where appropriate
- [ ] Memory usage considered

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Tests added for new functionality
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No merge conflicts
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs automatically
2. **Code Review**: At least one maintainer reviews the code
3. **Testing**: Reviewers may test the changes locally
4. **Approval**: Changes must be approved before merging
5. **Merge**: Maintainers merge approved pull requests

### Review Criteria

- **Functionality**: Does the code work as intended?
- **Code Quality**: Is the code clean, readable, and maintainable?
- **Performance**: Are there any performance implications?
- **Security**: Are there any security concerns?
- **Testing**: Is the code adequately tested?
- **Documentation**: Is the code properly documented?

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** for solutions
3. **Try the latest version** to see if the issue is resolved
4. **Gather relevant information** about your environment

### Bug Reports

Use the bug report template:

```markdown
## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
A clear and concise description of what actually happened.

## Environment
- OS: [e.g. Ubuntu 20.04]
- Node.js version: [e.g. 18.16.0]
- npm version: [e.g. 9.5.1]
- Service version: [e.g. 1.0.0]

## Additional Context
Add any other context about the problem here.

## Logs
```
Paste relevant logs here
```

## Screenshots
If applicable, add screenshots to help explain your problem.
```

### Feature Requests

Use the feature request template:

```markdown
## Feature Description
A clear and concise description of the feature you'd like to see.

## Problem Statement
Describe the problem this feature would solve.

## Proposed Solution
Describe the solution you'd like to see implemented.

## Alternatives Considered
Describe any alternative solutions you've considered.

## Additional Context
Add any other context or screenshots about the feature request here.

## Implementation Notes
Any technical considerations or implementation details.
```

## 🔒 Security Vulnerabilities

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md):

1. **Do NOT** create a public issue
2. **Email** security@project5.com with details
3. **Include** steps to reproduce
4. **Wait** for our response before disclosure

## 🤝 Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat with the community
- **Email**: security@project5.com for security issues

### Getting Help

1. **Check the documentation** first
2. **Search existing issues** and discussions
3. **Ask in GitHub Discussions** for general questions
4. **Create an issue** for bugs or feature requests
5. **Join our Discord** for real-time help

### Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

## 🎉 Recognition

We appreciate all contributions! Contributors will be:

- **Listed** in the CONTRIBUTORS.md file
- **Mentioned** in release notes for significant contributions
- **Invited** to join the maintainers team for outstanding contributions
- **Featured** on our website and social media

## 📚 Additional Resources

- [Project Documentation](https://github.com/project5/user-service/wiki)
- [API Documentation](https://api-docs.project5.com/user-service)
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Security Guide](docs/SECURITY.md)
- [Performance Guide](docs/PERFORMANCE.md)

---

**Thank you for contributing to the User Service! 🚀**

Your contributions help make this project better for everyone. If you have any questions, don't hesitate to reach out to the maintainers or the community.