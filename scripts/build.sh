#!/bin/bash

# Project-5 Build Script
# Builds all components of the multi-cloud application

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_ROOT}/logs/build-$(date +%Y%m%d-%H%M%S).log"

# Default values
BUILD_TYPE="development"
SKIP_TESTS=false
SKIP_LINT=false
PUSH_IMAGES=false
VERBOSE=false
CLEAN=false
PARALLEL=true
DOCKER_REGISTRY="${DOCKER_REGISTRY:-localhost:5000}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    log "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Project-5 Build Script

Usage: $0 [OPTIONS]

Options:
    -t, --type TYPE            Build type (development, staging, production)
    -r, --registry REGISTRY    Docker registry URL
    --tag TAG                  Docker image tag
    --skip-tests              Skip running tests
    --skip-lint               Skip linting
    --push                    Push images to registry
    --clean                   Clean build artifacts before building
    --no-parallel             Disable parallel builds
    -v, --verbose             Enable verbose output
    -h, --help                Show this help message

Examples:
    $0                                    # Development build
    $0 --type production --push           # Production build and push
    $0 --registry myregistry.com --tag v1.0.0
    $0 --clean --verbose

Environment Variables:
    DOCKER_REGISTRY           Default Docker registry
    IMAGE_TAG                 Default image tag
    NODE_ENV                  Node.js environment
    BUILD_NUMBER              CI build number

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--type)
                BUILD_TYPE="$2"
                shift 2
                ;;
            -r|--registry)
                DOCKER_REGISTRY="$2"
                shift 2
                ;;
            --tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-lint)
                SKIP_LINT=true
                shift
                ;;
            --push)
                PUSH_IMAGES=true
                shift
                ;;
            --clean)
                CLEAN=true
                shift
                ;;
            --no-parallel)
                PARALLEL=false
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Validate build environment
validate_environment() {
    log_info "Validating build environment..."
    
    # Create logs directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Check required tools
    local required_tools=("node" "npm" "docker")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Validate build type
    case $BUILD_TYPE in
        development|staging|production)
            log_info "Build type: $BUILD_TYPE"
            ;;
        *)
            log_error "Invalid build type: $BUILD_TYPE"
            exit 1
            ;;
    esac
    
    # Set NODE_ENV based on build type
    export NODE_ENV="$BUILD_TYPE"
    
    log_success "Environment validation completed"
}

# Clean build artifacts
clean_artifacts() {
    if [[ "$CLEAN" == "false" ]]; then
        return 0
    fi
    
    log_info "Cleaning build artifacts..."
    
    # Clean frontend build
    if [[ -d "${PROJECT_ROOT}/applications/frontend/build" ]]; then
        rm -rf "${PROJECT_ROOT}/applications/frontend/build"
        log_info "Cleaned frontend build directory"
    fi
    
    # Clean backend build
    if [[ -d "${PROJECT_ROOT}/applications/backend-api/dist" ]]; then
        rm -rf "${PROJECT_ROOT}/applications/backend-api/dist"
        log_info "Cleaned backend build directory"
    fi
    
    # Clean user service build
    if [[ -d "${PROJECT_ROOT}/applications/microservices/user-service/dist" ]]; then
        rm -rf "${PROJECT_ROOT}/applications/microservices/user-service/dist"
        log_info "Cleaned user service build directory"
    fi
    
    # Clean node_modules if requested
    if [[ "${CLEAN_DEPS:-false}" == "true" ]]; then
        find "$PROJECT_ROOT" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
        log_info "Cleaned node_modules directories"
    fi
    
    # Clean Docker build cache
    if [[ "${CLEAN_DOCKER:-false}" == "true" ]]; then
        docker builder prune -f
        log_info "Cleaned Docker build cache"
    fi
    
    log_success "Cleanup completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    local components=(
        "applications/frontend"
        "applications/backend-api"
        "applications/microservices/user-service"
    )
    
    for component in "${components[@]}"; do
        local component_path="${PROJECT_ROOT}/${component}"
        if [[ -f "${component_path}/package.json" ]]; then
            log_info "Installing dependencies for $component..."
            cd "$component_path"
            
            # Use npm ci for production builds, npm install for development
            if [[ "$BUILD_TYPE" == "production" ]]; then
                npm ci --only=production
            else
                npm install
            fi
        fi
    done
    
    cd "$PROJECT_ROOT"
    log_success "Dependencies installation completed"
}

# Run linting
run_lint() {
    if [[ "$SKIP_LINT" == "true" ]]; then
        log_info "Skipping linting"
        return 0
    fi
    
    log_info "Running linting..."
    
    local components=(
        "applications/frontend"
        "applications/backend-api"
        "applications/microservices/user-service"
    )
    
    local lint_failed=false
    
    for component in "${components[@]}"; do
        local component_path="${PROJECT_ROOT}/${component}"
        if [[ -f "${component_path}/package.json" ]]; then
            log_info "Linting $component..."
            cd "$component_path"
            
            # Check if lint script exists
            if npm run | grep -q "lint"; then
                if ! npm run lint; then
                    log_error "Linting failed for $component"
                    lint_failed=true
                fi
            else
                log_warn "No lint script found for $component"
            fi
        fi
    done
    
    cd "$PROJECT_ROOT"
    
    if [[ "$lint_failed" == "true" ]]; then
        log_error "Linting failed"
        exit 1
    fi
    
    log_success "Linting completed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_info "Skipping tests"
        return 0
    fi
    
    log_info "Running tests..."
    
    local components=(
        "applications/frontend"
        "applications/backend-api"
        "applications/microservices/user-service"
    )
    
    local test_failed=false
    
    for component in "${components[@]}"; do
        local component_path="${PROJECT_ROOT}/${component}"
        if [[ -f "${component_path}/package.json" ]]; then
            log_info "Testing $component..."
            cd "$component_path"
            
            # Check if test script exists
            if npm run | grep -q "test"; then
                if ! npm test; then
                    log_error "Tests failed for $component"
                    test_failed=true
                fi
            else
                log_warn "No test script found for $component"
            fi
        fi
    done
    
    cd "$PROJECT_ROOT"
    
    if [[ "$test_failed" == "true" ]]; then
        log_error "Tests failed"
        exit 1
    fi
    
    log_success "Tests completed"
}

# Build applications
build_applications() {
    log_info "Building applications..."
    
    local components=(
        "applications/frontend"
        "applications/backend-api"
        "applications/microservices/user-service"
    )
    
    local build_failed=false
    
    for component in "${components[@]}"; do
        local component_path="${PROJECT_ROOT}/${component}"
        if [[ -f "${component_path}/package.json" ]]; then
            log_info "Building $component..."
            cd "$component_path"
            
            # Set environment variables
            export NODE_ENV="$BUILD_TYPE"
            export BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M%S)}"
            
            # Check if build script exists
            if npm run | grep -q "build"; then
                if ! npm run build; then
                    log_error "Build failed for $component"
                    build_failed=true
                fi
            else
                log_warn "No build script found for $component"
            fi
        fi
    done
    
    cd "$PROJECT_ROOT"
    
    if [[ "$build_failed" == "true" ]]; then
        log_error "Application build failed"
        exit 1
    fi
    
    log_success "Application build completed"
}

# Build Docker image
build_docker_image() {
    local component="$1"
    local image_name="$2"
    local dockerfile="${3:-Dockerfile}"
    
    local component_path="${PROJECT_ROOT}/${component}"
    local full_image_name="${DOCKER_REGISTRY}/${image_name}:${IMAGE_TAG}"
    
    if [[ ! -f "${component_path}/${dockerfile}" ]]; then
        log_warn "Dockerfile not found for $component, skipping Docker build"
        return 0
    fi
    
    log_info "Building Docker image for $component..."
    
    cd "$component_path"
    
    # Build arguments
    local build_args=()
    build_args+=("--build-arg" "NODE_ENV=${BUILD_TYPE}")
    build_args+=("--build-arg" "BUILD_NUMBER=${BUILD_NUMBER:-$(date +%Y%m%d%H%M%S)}")
    
    # Add build type specific arguments
    case $BUILD_TYPE in
        production)
            build_args+=("--build-arg" "OPTIMIZE=true")
            ;;
        development)
            build_args+=("--build-arg" "DEBUG=true")
            ;;
    esac
    
    # Build the image
    if ! docker build \
        "${build_args[@]}" \
        -t "$full_image_name" \
        -f "$dockerfile" \
        .; then
        log_error "Docker build failed for $component"
        return 1
    fi
    
    # Tag with additional tags
    if [[ "$BUILD_TYPE" == "production" ]]; then
        docker tag "$full_image_name" "${DOCKER_REGISTRY}/${image_name}:stable"
    fi
    
    if [[ -n "${BUILD_NUMBER:-}" ]]; then
        docker tag "$full_image_name" "${DOCKER_REGISTRY}/${image_name}:build-${BUILD_NUMBER}"
    fi
    
    log_success "Docker image built: $full_image_name"
    
    cd "$PROJECT_ROOT"
}

# Build all Docker images
build_docker_images() {
    log_info "Building Docker images..."
    
    local images=(
        "applications/frontend:project5-frontend"
        "applications/backend-api:project5-backend-api"
        "applications/microservices/user-service:project5-user-service"
    )
    
    local build_failed=false
    
    if [[ "$PARALLEL" == "true" ]]; then
        # Build images in parallel
        local pids=()
        for image_spec in "${images[@]}"; do
            IFS=':' read -r component image_name <<< "$image_spec"
            build_docker_image "$component" "$image_name" &
            pids+=("$!")
        done
        
        # Wait for all builds to complete
        for pid in "${pids[@]}"; do
            if ! wait "$pid"; then
                build_failed=true
            fi
        done
    else
        # Build images sequentially
        for image_spec in "${images[@]}"; do
            IFS=':' read -r component image_name <<< "$image_spec"
            if ! build_docker_image "$component" "$image_name"; then
                build_failed=true
            fi
        done
    fi
    
    if [[ "$build_failed" == "true" ]]; then
        log_error "Docker image build failed"
        exit 1
    fi
    
    log_success "Docker images build completed"
}

# Push Docker images
push_docker_images() {
    if [[ "$PUSH_IMAGES" == "false" ]]; then
        log_info "Skipping image push"
        return 0
    fi
    
    log_info "Pushing Docker images..."
    
    local images=(
        "project5-frontend"
        "project5-backend-api"
        "project5-user-service"
    )
    
    for image_name in "${images[@]}"; do
        local full_image_name="${DOCKER_REGISTRY}/${image_name}:${IMAGE_TAG}"
        
        log_info "Pushing $full_image_name..."
        if ! docker push "$full_image_name"; then
            log_error "Failed to push $full_image_name"
            exit 1
        fi
        
        # Push additional tags
        if [[ "$BUILD_TYPE" == "production" ]]; then
            docker push "${DOCKER_REGISTRY}/${image_name}:stable"
        fi
        
        if [[ -n "${BUILD_NUMBER:-}" ]]; then
            docker push "${DOCKER_REGISTRY}/${image_name}:build-${BUILD_NUMBER}"
        fi
    done
    
    log_success "Docker images push completed"
}

# Generate build report
generate_build_report() {
    log_info "Generating build report..."
    
    local report_file="${PROJECT_ROOT}/logs/build-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "build": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "type": "$BUILD_TYPE",
    "tag": "$IMAGE_TAG",
    "registry": "$DOCKER_REGISTRY",
    "buildNumber": "${BUILD_NUMBER:-}",
    "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
  },
  "images": [
    {
      "name": "project5-frontend",
      "tag": "$IMAGE_TAG",
      "size": "$(docker images --format 'table {{.Size}}' ${DOCKER_REGISTRY}/project5-frontend:${IMAGE_TAG} 2>/dev/null | tail -n1 || echo 'unknown')"
    },
    {
      "name": "project5-backend-api",
      "tag": "$IMAGE_TAG",
      "size": "$(docker images --format 'table {{.Size}}' ${DOCKER_REGISTRY}/project5-backend-api:${IMAGE_TAG} 2>/dev/null | tail -n1 || echo 'unknown')"
    },
    {
      "name": "project5-user-service",
      "tag": "$IMAGE_TAG",
      "size": "$(docker images --format 'table {{.Size}}' ${DOCKER_REGISTRY}/project5-user-service:${IMAGE_TAG} 2>/dev/null | tail -n1 || echo 'unknown')"
    }
  ],
  "options": {
    "skipTests": $SKIP_TESTS,
    "skipLint": $SKIP_LINT,
    "pushImages": $PUSH_IMAGES,
    "clean": $CLEAN,
    "parallel": $PARALLEL
  }
}
EOF
    
    log_info "Build report saved to: $report_file"
}

# Main build function
main() {
    log_info "Starting Project-5 build..."
    log_info "Build type: $BUILD_TYPE"
    log_info "Image tag: $IMAGE_TAG"
    log_info "Registry: $DOCKER_REGISTRY"
    
    # Run build steps
    validate_environment
    clean_artifacts
    install_dependencies
    run_lint
    run_tests
    build_applications
    build_docker_images
    push_docker_images
    generate_build_report
    
    log_success "Project-5 build completed successfully!"
    log_info "Build logs saved to: $LOG_FILE"
    
    # Display build summary
    echo
    echo "=== Build Summary ==="
    echo "Build Type: $BUILD_TYPE"
    echo "Image Tag: $IMAGE_TAG"
    echo "Registry: $DOCKER_REGISTRY"
    echo "Log File: $LOG_FILE"
    echo
    echo "=== Built Images ==="
    docker images | grep "$DOCKER_REGISTRY" | grep "$IMAGE_TAG" || echo "No images found"
}

# Parse arguments and run main function
parse_args "$@"
main