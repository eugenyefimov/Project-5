#!/bin/bash

# Project-5 Development Deployment Script
# Deploys the multi-cloud application to development environment

set -e

echo "🚀 Deploying Project-5 to Development Environment"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
ENVIRONMENT="development"
COMPOSE_FILE="docker-compose.dev.yml"

# Check if environment file exists
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env.dev" ]; then
        print_error "Development environment file (.env.dev) not found!"
        print_status "Run './scripts/setup.sh' first to initialize the project."
        exit 1
    fi
    
    # Load environment variables
    source .env.dev
    
    print_status "Environment configuration loaded."
}

# Validate prerequisites
validate_prerequisites() {
    print_status "Validating prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed or not in PATH."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi
    
    print_status "Prerequisites validation completed."
}

# Build application images
build_images() {
    print_status "Building application Docker images..."
    
    # Build frontend image
    if [ -f "applications/frontend/Dockerfile" ]; then
        print_status "Building frontend image..."
        docker build -t project5-frontend:dev applications/frontend/
    fi
    
    # Build backend API image
    if [ -f "applications/backend-api/Dockerfile" ]; then
        print_status "Building backend API image..."
        docker build -t project5-backend-api:dev applications/backend-api/
    fi
    
    # Build microservices
    for service in applications/microservices/*/; do
        if [ -f "$service/Dockerfile" ]; then
            service_name=$(basename "$service")
            print_status "Building microservice: $service_name..."
            docker build -t "project5-$service_name:dev" "$service"
        fi
    done
    
    print_status "Application images built successfully."
}

# Deploy infrastructure services
deploy_infrastructure() {
    print_status "Deploying infrastructure services..."
    
    # Start core infrastructure services
    docker-compose -f infrastructure/docker-compose.dev.yml up -d
    
    # Wait for services to be ready
    print_status "Waiting for infrastructure services to be ready..."
    sleep 30
    
    # Check service health
    check_service_health "postgresql" 5432
    check_service_health "redis" 6379
    
    print_status "Infrastructure services deployed successfully."
}

# Check service health
check_service_health() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Checking $service_name health..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port; then
            print_status "$service_name is ready!"
            return 0
        fi
        
        print_status "Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to start within expected time."
    return 1
}

# Deploy applications
deploy_applications() {
    print_status "Deploying applications..."
    
    # Deploy using Docker Compose
    if [ -f "$COMPOSE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" up -d
    else
        print_warning "$COMPOSE_FILE not found. Creating basic deployment..."
        create_basic_compose_file
        docker-compose -f "$COMPOSE_FILE" up -d
    fi
    
    print_status "Applications deployed successfully."
}

# Create basic Docker Compose file
create_basic_compose_file() {
    print_status "Creating basic Docker Compose configuration..."
    
    cat > "$COMPOSE_FILE" << 'EOF'
version: '3.8'

services:
  frontend:
    image: project5-frontend:dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    networks:
      - project5-network
    depends_on:
      - backend-api

  backend-api:
    image: project5-backend-api:dev
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgresql
      - REDIS_HOST=redis
    networks:
      - project5-network
    depends_on:
      - postgresql
      - redis

  postgresql:
    image: postgres:13
    environment:
      - POSTGRES_DB=project5_dev
      - POSTGRES_USER=dev_user
      - POSTGRES_PASSWORD=dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - project5-network

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    networks:
      - project5-network

networks:
  project5-network:
    external: true

volumes:
  postgres_data:
EOF

    print_status "Basic Docker Compose file created."
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Wait for database to be fully ready
    sleep 10
    
    # Run migrations if available
    if [ -f "applications/databases/migrations/init.sql" ]; then
        docker exec -i $(docker-compose -f "$COMPOSE_FILE" ps -q postgresql) psql -U dev_user -d project5_dev < applications/databases/migrations/init.sql
        print_status "Database migrations completed."
    else
        print_warning "No database migrations found."
    fi
}

# Seed development data
seed_data() {
    print_status "Seeding development data..."
    
    if [ -f "applications/databases/seeds/dev-data.sql" ]; then
        docker exec -i $(docker-compose -f "$COMPOSE_FILE" ps -q postgresql) psql -U dev_user -d project5_dev < applications/databases/seeds/dev-data.sql
        print_status "Development data seeded successfully."
    else
        print_warning "No seed data found."
    fi
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check if services are running
    print_status "Checking service status..."
    docker-compose -f "$COMPOSE_FILE" ps
    
    # Test service endpoints
    print_status "Testing service endpoints..."
    
    # Test frontend
    if curl -f http://localhost:3000 &> /dev/null; then
        print_status "✅ Frontend is accessible at http://localhost:3000"
    else
        print_warning "❌ Frontend not accessible"
    fi
    
    # Test backend API
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_status "✅ Backend API is accessible at http://localhost:8000"
    else
        print_warning "❌ Backend API not accessible (this is normal if health endpoint doesn't exist)"
    fi
    
    print_status "Deployment verification completed."
}

# Setup monitoring
setup_monitoring() {
    print_status "Setting up development monitoring..."
    
    # Start monitoring stack if available
    if [ -f "monitoring/docker-compose.dev.yml" ]; then
        docker-compose -f monitoring/docker-compose.dev.yml up -d
        print_status "Monitoring stack started."
        print_status "📊 Grafana will be available at http://localhost:3001"
        print_status "📈 Prometheus will be available at http://localhost:9090"
    else
        print_warning "Monitoring configuration not found."
    fi
}

# Display deployment info
display_info() {
    echo ""
    echo "================================================================="
    echo -e "${GREEN}✅ Development deployment completed successfully!${NC}"
    echo "================================================================="
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend:     http://localhost:3000"
    echo "   Backend API:  http://localhost:8000"
    echo "   Database:     localhost:5432"
    echo "   Redis:        localhost:6379"
    echo ""
    echo "📊 Monitoring (if enabled):"
    echo "   Grafana:      http://localhost:3001 (admin/admin)"
    echo "   Prometheus:   http://localhost:9090"
    echo ""
    echo "🔧 Useful commands:"
    echo "   View logs:    docker-compose -f $COMPOSE_FILE logs -f"
    echo "   Stop all:     docker-compose -f $COMPOSE_FILE down"
    echo "   Restart:      docker-compose -f $COMPOSE_FILE restart"
    echo ""
    echo "📚 Documentation: ./docs/"
    echo "🔍 Troubleshooting: ./docs/troubleshooting/"
}

# Cleanup on error
cleanup_on_error() {
    print_error "Deployment failed. Cleaning up..."
    docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    exit 1
}

# Trap errors
trap cleanup_on_error ERR

# Main execution
main() {
    print_status "Starting development deployment..."
    
    check_environment
    validate_prerequisites
    build_images
    deploy_infrastructure
    deploy_applications
    run_migrations
    seed_data
    setup_monitoring
    verify_deployment
    display_info
    
    print_status "Development environment is ready! 🚀"
}

# Run main function
main "$@"
