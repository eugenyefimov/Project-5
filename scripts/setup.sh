#!/bin/bash

# Project-5 Setup Script
# Initializes the multi-cloud enterprise infrastructure project

set -e

echo "🚀 Initializing Project-5 - Enterprise Multi-Cloud Infrastructure"
echo "================================================================="

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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker and try again."
        exit 1
    fi
    
    # Check Kubernetes CLI
    if ! command -v kubectl &> /dev/null; then
        print_warning "kubectl is not installed. Some features may not work."
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_warning "Terraform is not installed. Infrastructure provisioning will not work."
    fi
    
    # Check Helm
    if ! command -v helm &> /dev/null; then
        print_warning "Helm is not installed. Kubernetes application deployment may not work."
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed. Frontend development will not work."
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_warning "Python 3 is not installed. Some automation scripts may not work."
    fi
    
    print_status "Prerequisites check completed."
}

# Initialize Git hooks
setup_git_hooks() {
    print_status "Setting up Git hooks..."
    
    if [ -d ".git" ]; then
        # Pre-commit hook for code quality
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook for Project-5

echo "Running pre-commit checks..."

# Run Terraform format check
if command -v terraform &> /dev/null; then
    terraform fmt -check=true -recursive infrastructure/terraform/
fi

# Run Docker lint if available
if command -v hadolint &> /dev/null; then
    find . -name "Dockerfile*" -exec hadolint {} \;
fi

echo "Pre-commit checks completed."
EOF
        chmod +x .git/hooks/pre-commit
        print_status "Git hooks configured."
    else
        print_warning "Not a Git repository. Skipping Git hooks setup."
    fi
}

# Create environment files
create_env_files() {
    print_status "Creating environment configuration files..."
    
    # Development environment
    cat > .env.dev << 'EOF'
# Development Environment Configuration
NODE_ENV=development
DEBUG=true

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project5_dev
DB_USER=dev_user
DB_PASSWORD=dev_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS Configuration (Development)
AWS_REGION=us-west-2
AWS_S3_BUCKET=project5-dev-assets

# Azure Configuration (Development)
AZURE_STORAGE_ACCOUNT=project5devstore
AZURE_CONTAINER_NAME=assets

# GCP Configuration (Development)
GCP_PROJECT_ID=project5-dev
GCP_BUCKET_NAME=project5-dev-storage
EOF

    # Production environment template
    cat > .env.prod.template << 'EOF'
# Production Environment Configuration Template
# Copy to .env.prod and fill in actual values

NODE_ENV=production
DEBUG=false

# Database Configuration
DB_HOST=your-prod-db-host
DB_PORT=5432
DB_NAME=project5_prod
DB_USER=prod_user
DB_PASSWORD=your-secure-password

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379

# AWS Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-prod-s3-bucket
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Azure Configuration
AZURE_STORAGE_ACCOUNT=your-azure-storage
AZURE_CONTAINER_NAME=assets
AZURE_STORAGE_KEY=your-azure-key

# GCP Configuration
GCP_PROJECT_ID=your-gcp-project
GCP_BUCKET_NAME=your-gcp-bucket
GOOGLE_APPLICATION_CREDENTIALS=path-to-service-account.json
EOF

    print_status "Environment files created."
}

# Initialize Docker environment
setup_docker() {
    print_status "Setting up Docker environment..."
    
    # Create Docker network for local development
    docker network create project5-network 2>/dev/null || true
    
    # Pull base images
    print_status "Pulling base Docker images..."
    docker pull node:16-alpine
    docker pull nginx:alpine
    docker pull postgres:13
    docker pull redis:6-alpine
    
    print_status "Docker environment setup completed."
}

# Install dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    # Frontend dependencies
    if [ -f "applications/frontend/package.json" ]; then
        print_status "Installing frontend dependencies..."
        cd applications/frontend
        npm install
        cd ../..
    fi
    
    # Backend API dependencies
    if [ -f "applications/backend-api/package.json" ]; then
        print_status "Installing backend API dependencies..."
        cd applications/backend-api
        npm install
        cd ../..
    fi
    
    # Python dependencies for scripts
    if [ -f "requirements.txt" ]; then
        print_status "Installing Python dependencies..."
        pip3 install -r requirements.txt
    fi
}

# Initialize Terraform modules
init_terraform() {
    print_status "Initializing Terraform modules..."
    
    # Initialize AWS module
    if [ -d "infrastructure/terraform/aws" ]; then
        cd infrastructure/terraform/aws
        terraform init
        cd ../../..
    fi
    
    # Initialize Azure module
    if [ -d "infrastructure/terraform/azure" ]; then
        cd infrastructure/terraform/azure
        terraform init
        cd ../../..
    fi
    
    # Initialize GCP module
    if [ -d "infrastructure/terraform/gcp" ]; then
        cd infrastructure/terraform/gcp
        terraform init
        cd ../../..
    fi
    
    print_status "Terraform modules initialized."
}

# Create necessary directories and files
create_project_structure() {
    print_status "Ensuring project structure is complete..."
    
    # Create any missing directories
    mkdir -p logs
    mkdir -p temp
    mkdir -p backup
    
    # Create gitkeep files for empty directories
    find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;
    
    print_status "Project structure verified."
}

# Main execution
main() {
    print_status "Starting Project-5 initialization..."
    
    check_prerequisites
    setup_git_hooks
    create_env_files
    create_project_structure
    
    if command -v docker &> /dev/null; then
        setup_docker
    fi
    
    install_dependencies
    
    if command -v terraform &> /dev/null; then
        init_terraform
    fi
    
    echo ""
    echo "================================================================="
    echo -e "${GREEN}✅ Project-5 initialization completed successfully!${NC}"
    echo "================================================================="
    echo ""
    echo "Next steps:"
    echo "1. Configure your cloud provider credentials"
    echo "2. Review and update .env.dev file"
    echo "3. Run './scripts/deploy-dev.sh' to deploy development environment"
    echo "4. Check documentation in docs/ directory"
    echo ""
    echo "For more information, visit: https://github.com/eugenyefimov/Project-5"
}

# Run main function
main "$@"
