# User Service Makefile
# Provides convenient commands for development, testing, and deployment

# Variables
SERVICE_NAME := user-service
DOCKER_IMAGE := $(SERVICE_NAME)
DOCKER_TAG := latest
DOCKER_REGISTRY := your-registry.com
KUBERNETES_NAMESPACE := project5
NODE_VERSION := 18
PORT := 3002

# Colors for output
RED := \033[31m
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
MAGENTA := \033[35m
CYAN := \033[36m
WHITE := \033[37m
RESET := \033[0m

# Default target
.DEFAULT_GOAL := help

# Help target
.PHONY: help
help: ## Show this help message
	@echo "$(CYAN)User Service - Available Commands$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)Examples:$(RESET)"
	@echo "  make install          # Install dependencies"
	@echo "  make dev              # Start development server"
	@echo "  make test             # Run unit tests"
	@echo "  make test-all         # Run all tests"
	@echo "  make docker-build     # Build Docker image"
	@echo "  make deploy-k8s       # Deploy to Kubernetes"

# Development Commands
.PHONY: install
install: ## Install dependencies
	@echo "$(GREEN)Installing dependencies...$(RESET)"
	npm install
	@echo "$(GREEN)Dependencies installed successfully!$(RESET)"

.PHONY: install-dev
install-dev: ## Install development dependencies
	@echo "$(GREEN)Installing development dependencies...$(RESET)"
	npm install --include=dev
	npm run setup:dev
	@echo "$(GREEN)Development environment ready!$(RESET)"

.PHONY: dev
dev: ## Start development server with hot reload
	@echo "$(GREEN)Starting development server...$(RESET)"
	npm run dev

.PHONY: start
start: ## Start production server
	@echo "$(GREEN)Starting production server...$(RESET)"
	npm start

.PHONY: stop
stop: ## Stop running server
	@echo "$(YELLOW)Stopping server...$(RESET)"
	@pkill -f "node src/app.js" || echo "No server process found"

# Testing Commands
.PHONY: test
test: ## Run unit tests
	@echo "$(GREEN)Running unit tests...$(RESET)"
	npm run test:unit

.PHONY: test-integration
test-integration: ## Run integration tests
	@echo "$(GREEN)Running integration tests...$(RESET)"
	npm run test:integration

.PHONY: test-performance
test-performance: ## Run performance tests
	@echo "$(GREEN)Running performance tests...$(RESET)"
	npm run test:performance

.PHONY: test-security
test-security: ## Run security tests
	@echo "$(GREEN)Running security tests...$(RESET)"
	npm run test:security

.PHONY: test-all
test-all: ## Run all tests
	@echo "$(GREEN)Running all tests...$(RESET)"
	npm run test:all

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	@echo "$(GREEN)Running tests in watch mode...$(RESET)"
	npm run test:watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	@echo "$(GREEN)Running tests with coverage...$(RESET)"
	npm run test:coverage
	@echo "$(BLUE)Coverage report available at: coverage/lcov-report/index.html$(RESET)"

.PHONY: test-ci
test-ci: ## Run tests for CI/CD
	@echo "$(GREEN)Running CI tests...$(RESET)"
	npm run test:ci

# Code Quality Commands
.PHONY: lint
lint: ## Run ESLint
	@echo "$(GREEN)Running ESLint...$(RESET)"
	npm run lint

.PHONY: lint-fix
lint-fix: ## Fix ESLint issues
	@echo "$(GREEN)Fixing ESLint issues...$(RESET)"
	npm run lint:fix

.PHONY: format
format: ## Format code with Prettier
	@echo "$(GREEN)Formatting code...$(RESET)"
	npm run format

.PHONY: format-check
format-check: ## Check code formatting
	@echo "$(GREEN)Checking code formatting...$(RESET)"
	npm run format:check

.PHONY: quality
quality: lint format-check test ## Run all quality checks
	@echo "$(GREEN)All quality checks completed!$(RESET)"

# Database Commands
.PHONY: db-setup
db-setup: ## Setup database (migrate and seed)
	@echo "$(GREEN)Setting up database...$(RESET)"
	npm run db:setup

.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(RESET)"
	npm run migrate

.PHONY: db-seed
db-seed: ## Seed database with test data
	@echo "$(GREEN)Seeding database...$(RESET)"
	npm run seed

.PHONY: db-reset
db-reset: ## Reset database (drop, migrate, seed)
	@echo "$(YELLOW)Resetting database...$(RESET)"
	npm run db:reset

# Docker Commands
.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "$(GREEN)Building Docker image...$(RESET)"
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo "$(GREEN)Docker image built: $(DOCKER_IMAGE):$(DOCKER_TAG)$(RESET)"

.PHONY: docker-run
docker-run: ## Run Docker container
	@echo "$(GREEN)Running Docker container...$(RESET)"
	docker run -d --name $(SERVICE_NAME) -p $(PORT):$(PORT) --env-file .env $(DOCKER_IMAGE):$(DOCKER_TAG)
	@echo "$(GREEN)Container started at http://localhost:$(PORT)$(RESET)"

.PHONY: docker-stop
docker-stop: ## Stop Docker container
	@echo "$(YELLOW)Stopping Docker container...$(RESET)"
	docker stop $(SERVICE_NAME) || true
	docker rm $(SERVICE_NAME) || true

.PHONY: docker-logs
docker-logs: ## Show Docker container logs
	@echo "$(GREEN)Showing Docker logs...$(RESET)"
	docker logs -f $(SERVICE_NAME)

.PHONY: docker-shell
docker-shell: ## Access Docker container shell
	@echo "$(GREEN)Accessing container shell...$(RESET)"
	docker exec -it $(SERVICE_NAME) /bin/sh

.PHONY: docker-test
docker-test: ## Run tests in Docker
	@echo "$(GREEN)Running tests in Docker...$(RESET)"
	docker run --rm -e NODE_ENV=test $(DOCKER_IMAGE):$(DOCKER_TAG) npm test

.PHONY: docker-push
docker-push: ## Push Docker image to registry
	@echo "$(GREEN)Pushing Docker image to registry...$(RESET)"
	docker tag $(DOCKER_IMAGE):$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE):$(DOCKER_TAG)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE):$(DOCKER_TAG)

# Docker Compose Commands
.PHONY: compose-up
compose-up: ## Start services with Docker Compose
	@echo "$(GREEN)Starting services with Docker Compose...$(RESET)"
	docker-compose up -d

.PHONY: compose-down
compose-down: ## Stop services with Docker Compose
	@echo "$(YELLOW)Stopping services with Docker Compose...$(RESET)"
	docker-compose down

.PHONY: compose-logs
compose-logs: ## Show Docker Compose logs
	@echo "$(GREEN)Showing Docker Compose logs...$(RESET)"
	docker-compose logs -f

.PHONY: compose-build
compose-build: ## Build services with Docker Compose
	@echo "$(GREEN)Building services with Docker Compose...$(RESET)"
	docker-compose build

# Kubernetes Commands
.PHONY: k8s-deploy
k8s-deploy: ## Deploy to Kubernetes
	@echo "$(GREEN)Deploying to Kubernetes...$(RESET)"
	kubectl apply -f k8s/ -n $(KUBERNETES_NAMESPACE)
	@echo "$(GREEN)Deployment completed!$(RESET)"

.PHONY: k8s-delete
k8s-delete: ## Delete from Kubernetes
	@echo "$(YELLOW)Deleting from Kubernetes...$(RESET)"
	kubectl delete -f k8s/ -n $(KUBERNETES_NAMESPACE)

.PHONY: k8s-status
k8s-status: ## Check Kubernetes deployment status
	@echo "$(GREEN)Checking Kubernetes status...$(RESET)"
	kubectl get pods,services,deployments -n $(KUBERNETES_NAMESPACE) -l app=$(SERVICE_NAME)

.PHONY: k8s-logs
k8s-logs: ## Show Kubernetes logs
	@echo "$(GREEN)Showing Kubernetes logs...$(RESET)"
	kubectl logs -f deployment/$(SERVICE_NAME) -n $(KUBERNETES_NAMESPACE)

.PHONY: k8s-shell
k8s-shell: ## Access Kubernetes pod shell
	@echo "$(GREEN)Accessing pod shell...$(RESET)"
	kubectl exec -it deployment/$(SERVICE_NAME) -n $(KUBERNETES_NAMESPACE) -- /bin/sh

# Health and Monitoring Commands
.PHONY: health
health: ## Check service health
	@echo "$(GREEN)Checking service health...$(RESET)"
	curl -f http://localhost:$(PORT)/health || echo "$(RED)Service is not healthy$(RESET)"

.PHONY: metrics
metrics: ## Show service metrics
	@echo "$(GREEN)Showing service metrics...$(RESET)"
	curl -s http://localhost:$(PORT)/metrics

.PHONY: logs
logs: ## Show application logs
	@echo "$(GREEN)Showing application logs...$(RESET)"
	npm run logs

# Security Commands
.PHONY: security-audit
security-audit: ## Run security audit
	@echo "$(GREEN)Running security audit...$(RESET)"
	npm audit
	npm run security:audit

.PHONY: security-fix
security-fix: ## Fix security vulnerabilities
	@echo "$(GREEN)Fixing security vulnerabilities...$(RESET)"
	npm audit fix
	npm run security:fix

.PHONY: deps-check
deps-check: ## Check for outdated dependencies
	@echo "$(GREEN)Checking for outdated dependencies...$(RESET)"
	npm run deps:check

.PHONY: deps-update
deps-update: ## Update dependencies
	@echo "$(GREEN)Updating dependencies...$(RESET)"
	npm run deps:update

# Utility Commands
.PHONY: clean
clean: ## Clean build artifacts and dependencies
	@echo "$(YELLOW)Cleaning build artifacts...$(RESET)"
	npm run clean
	rm -rf node_modules package-lock.json
	@echo "$(GREEN)Clean completed!$(RESET)"

.PHONY: reset
reset: clean install ## Reset project (clean and reinstall)
	@echo "$(GREEN)Project reset completed!$(RESET)"

.PHONY: setup
setup: install db-setup ## Setup project for development
	@echo "$(GREEN)Project setup completed!$(RESET)"

.PHONY: build
build: quality docker-build ## Build project (quality checks + Docker image)
	@echo "$(GREEN)Build completed successfully!$(RESET)"

# CI/CD Commands
.PHONY: ci
ci: install quality test-ci ## Run CI pipeline
	@echo "$(GREEN)CI pipeline completed!$(RESET)"

.PHONY: cd
cd: ci docker-build docker-push ## Run CD pipeline
	@echo "$(GREEN)CD pipeline completed!$(RESET)"

# Performance Commands
.PHONY: perf-profile
perf-profile: ## Profile application performance
	@echo "$(GREEN)Profiling application performance...$(RESET)"
	npx clinic doctor -- node src/app.js

.PHONY: perf-flame
perf-flame: ## Generate flame graph
	@echo "$(GREEN)Generating flame graph...$(RESET)"
	npx 0x src/app.js

.PHONY: load-test
load-test: ## Run load tests
	@echo "$(GREEN)Running load tests...$(RESET)"
	npx autocannon -c 10 -d 30 http://localhost:$(PORT)/health

# Documentation Commands
.PHONY: docs
docs: ## Generate API documentation
	@echo "$(GREEN)Generating API documentation...$(RESET)"
	@echo "API documentation available at http://localhost:$(PORT)/api-docs when server is running"

.PHONY: docs-serve
docs-serve: ## Serve documentation locally
	@echo "$(GREEN)Starting documentation server...$(RESET)"
	@echo "Visit http://localhost:$(PORT)/api-docs"
	npm start

# Environment Commands
.PHONY: env-check
env-check: ## Check environment variables
	@echo "$(GREEN)Checking environment variables...$(RESET)"
	@node -e "require('dotenv').config(); console.log('Environment loaded successfully');"

.PHONY: env-example
env-example: ## Create example environment file
	@echo "$(GREEN)Creating example environment file...$(RESET)"
	cp .env.development .env.example
	@echo "$(GREEN)Example environment file created!$(RESET)"

# Backup Commands
.PHONY: backup
backup: ## Create backup of important files
	@echo "$(GREEN)Creating backup...$(RESET)"
	mkdir -p backups
	tar -czf backups/backup-$(shell date +%Y%m%d-%H%M%S).tar.gz src/ package.json README.md
	@echo "$(GREEN)Backup created in backups/ directory$(RESET)"

# Git Commands
.PHONY: git-hooks
git-hooks: ## Setup Git hooks
	@echo "$(GREEN)Setting up Git hooks...$(RESET)"
	npx husky install
	npx husky add .husky/pre-commit "npm run precommit"
	npx husky add .husky/pre-push "npm run prepush"
	@echo "$(GREEN)Git hooks setup completed!$(RESET)"

# Quick Commands
.PHONY: quick-start
quick-start: install dev ## Quick start for development

.PHONY: quick-test
quick-test: test ## Quick test run

.PHONY: quick-deploy
quick-deploy: build k8s-deploy ## Quick deployment

# Status Commands
.PHONY: status
status: ## Show project status
	@echo "$(CYAN)=== User Service Status ===$(RESET)"
	@echo "$(YELLOW)Node Version:$(RESET) $(shell node --version)"
	@echo "$(YELLOW)NPM Version:$(RESET) $(shell npm --version)"
	@echo "$(YELLOW)Service Port:$(RESET) $(PORT)"
	@echo "$(YELLOW)Docker Image:$(RESET) $(DOCKER_IMAGE):$(DOCKER_TAG)"
	@echo "$(YELLOW)Kubernetes Namespace:$(RESET) $(KUBERNETES_NAMESPACE)"
	@echo ""
	@echo "$(BLUE)Recent Git Commits:$(RESET)"
	@git log --oneline -5 2>/dev/null || echo "No git repository found"
	@echo ""
	@echo "$(BLUE)Dependencies Status:$(RESET)"
	@npm list --depth=0 2>/dev/null | head -10 || echo "Dependencies not installed"

# Validate Commands
.PHONY: validate
validate: ## Validate project configuration
	@echo "$(GREEN)Validating project configuration...$(RESET)"
	@node -e "console.log('✓ Node.js is working')"
	@npm --version > /dev/null && echo "✓ NPM is working"
	@test -f package.json && echo "✓ package.json exists"
	@test -f .env.development && echo "✓ .env.development exists" || echo "⚠ .env.development missing"
	@test -f Dockerfile && echo "✓ Dockerfile exists"
	@test -d src && echo "✓ src directory exists"
	@echo "$(GREEN)Validation completed!$(RESET)"

# All-in-one Commands
.PHONY: all
all: setup quality test-all build ## Run everything (setup, quality, tests, build)
	@echo "$(GREEN)All tasks completed successfully!$(RESET)"

# Force targets (always run)
.PHONY: force
force:

# Make sure these targets are always executed
.PHONY: help install install-dev dev start stop test test-integration test-performance test-security test-all test-watch test-coverage test-ci lint lint-fix format format-check quality db-setup db-migrate db-seed db-reset docker-build docker-run docker-stop docker-logs docker-shell docker-test docker-push compose-up compose-down compose-logs compose-build k8s-deploy k8s-delete k8s-status k8s-logs k8s-shell health metrics logs security-audit security-fix deps-check deps-update clean reset setup build ci cd perf-profile perf-flame load-test docs docs-serve env-check env-example backup git-hooks quick-start quick-test quick-deploy status validate all