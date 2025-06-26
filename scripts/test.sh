#!/bin/bash

# Project-5 Test Script
# Runs comprehensive tests across all components

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_ROOT}/logs/test-$(date +%Y%m%d-%H%M%S).log"

# Default values
TEST_TYPE="all"
ENVIRONMENT="test"
COVERAGE=true
PARALLEL=true
VERBOSE=false
WATCH=false
FAIL_FAST=false
GENERATE_REPORT=true
COVERAGE_THRESHOLD=80
TEST_TIMEOUT=300

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
Project-5 Test Script

Usage: $0 [OPTIONS]

Options:
    -t, --type TYPE           Test type (unit, integration, e2e, performance, security, all)
    -e, --environment ENV     Test environment (test, development, staging)
    --no-coverage            Disable code coverage
    --no-parallel            Run tests sequentially
    --watch                  Watch mode for continuous testing
    --fail-fast              Stop on first test failure
    --no-report              Skip test report generation
    --threshold NUM          Coverage threshold percentage (default: 80)
    --timeout SECONDS        Test timeout in seconds (default: 300)
    -v, --verbose            Enable verbose output
    -h, --help               Show this help message

Test Types:
    unit                     Run unit tests only
    integration              Run integration tests only
    e2e                      Run end-to-end tests only
    performance              Run performance tests only
    security                 Run security tests only
    all                      Run all test types (default)

Examples:
    $0                                    # Run all tests
    $0 --type unit --coverage             # Run unit tests with coverage
    $0 --type e2e --environment staging   # Run e2e tests in staging
    $0 --watch --type unit                # Watch unit tests
    $0 --type performance --no-parallel   # Run performance tests sequentially

Environment Variables:
    NODE_ENV                 Node.js environment
    TEST_DATABASE_URL        Test database connection string
    TEST_REDIS_URL          Test Redis connection string
    CI                      Set to 'true' in CI environment

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--type)
                TEST_TYPE="$2"
                shift 2
                ;;
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --no-coverage)
                COVERAGE=false
                shift
                ;;
            --no-parallel)
                PARALLEL=false
                shift
                ;;
            --watch)
                WATCH=true
                shift
                ;;
            --fail-fast)
                FAIL_FAST=true
                shift
                ;;
            --no-report)
                GENERATE_REPORT=false
                shift
                ;;
            --threshold)
                COVERAGE_THRESHOLD="$2"
                shift 2
                ;;
            --timeout)
                TEST_TIMEOUT="$2"
                shift 2
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

# Validate test environment
validate_environment() {
    log_info "Validating test environment..."
    
    # Create logs directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Check required tools
    local required_tools=("node" "npm")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Validate test type
    case $TEST_TYPE in
        unit|integration|e2e|performance|security|all)
            log_info "Test type: $TEST_TYPE"
            ;;
        *)
            log_error "Invalid test type: $TEST_TYPE"
            exit 1
            ;;
    esac
    
    # Set environment variables
    export NODE_ENV="$ENVIRONMENT"
    export CI="${CI:-false}"
    
    # Load test environment variables
    local env_file="${PROJECT_ROOT}/.env.test"
    if [[ -f "$env_file" ]]; then
        set -a
        source "$env_file"
        set +a
        log_info "Loaded test environment from $env_file"
    fi
    
    log_success "Environment validation completed"
}

# Setup test databases
setup_test_databases() {
    log_info "Setting up test databases..."
    
    # Check if Docker is available for test databases
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        # Start test PostgreSQL if not running
        if ! docker ps | grep -q "test-postgres"; then
            log_info "Starting test PostgreSQL container..."
            docker run -d \
                --name test-postgres \
                -e POSTGRES_DB=project5_test \
                -e POSTGRES_USER=test \
                -e POSTGRES_PASSWORD=test \
                -p 5433:5432 \
                postgres:13-alpine
            
            # Wait for database to be ready
            sleep 10
        fi
        
        # Start test Redis if not running
        if ! docker ps | grep -q "test-redis"; then
            log_info "Starting test Redis container..."
            docker run -d \
                --name test-redis \
                -p 6380:6379 \
                redis:6-alpine
            
            # Wait for Redis to be ready
            sleep 5
        fi
        
        # Set test database URLs
        export TEST_DATABASE_URL="postgresql://test:test@localhost:5433/project5_test"
        export TEST_REDIS_URL="redis://localhost:6380"
    else
        log_warn "Docker not available, using configured test database URLs"
    fi
    
    log_success "Test databases setup completed"
}

# Install test dependencies
install_test_dependencies() {
    log_info "Installing test dependencies..."
    
    local components=(
        "applications/frontend"
        "applications/backend-api"
        "applications/microservices/user-service"
    )
    
    for component in "${components[@]}"; do
        local component_path="${PROJECT_ROOT}/${component}"
        if [[ -f "${component_path}/package.json" ]]; then
            log_info "Installing test dependencies for $component..."
            cd "$component_path"
            npm install --include=dev
        fi
    done
    
    # Install root test dependencies
    if [[ -f "${PROJECT_ROOT}/package.json" ]]; then
        cd "$PROJECT_ROOT"
        npm install --include=dev
    fi
    
    log_success "Test dependencies installation completed"
}

# Run unit tests
run_unit_tests() {
    log_info "Running unit tests..."
    
    local components=(
        "applications/frontend"
        "applications/backend-api"
        "applications/microservices/user-service"
    )
    
    local test_failed=false
    local coverage_args=()
    
    if [[ "$COVERAGE" == "true" ]]; then
        coverage_args+=("--coverage")
        coverage_args+=("--coverageThreshold" "{\"global\":{\"branches\":$COVERAGE_THRESHOLD,\"functions\":$COVERAGE_THRESHOLD,\"lines\":$COVERAGE_THRESHOLD,\"statements\":$COVERAGE_THRESHOLD}}")
    fi
    
    if [[ "$WATCH" == "true" ]]; then
        coverage_args+=("--watch")
    fi
    
    if [[ "$CI" == "true" ]]; then
        coverage_args+=("--ci")
        coverage_args+=("--watchAll=false")
    fi
    
    for component in "${components[@]}"; do
        local component_path="${PROJECT_ROOT}/${component}"
        if [[ -f "${component_path}/package.json" ]]; then
            log_info "Running unit tests for $component..."
            cd "$component_path"
            
            # Check if test script exists
            if npm run | grep -q "test"; then
                local test_command=("npm" "test")
                test_command+=("--")
                test_command+=("${coverage_args[@]}")
                
                if [[ "$VERBOSE" == "true" ]]; then
                    test_command+=("--verbose")
                fi
                
                if ! timeout "$TEST_TIMEOUT" "${test_command[@]}"; then
                    log_error "Unit tests failed for $component"
                    test_failed=true
                    
                    if [[ "$FAIL_FAST" == "true" ]]; then
                        break
                    fi
                fi
            else
                log_warn "No test script found for $component"
            fi
        fi
    done
    
    cd "$PROJECT_ROOT"
    
    if [[ "$test_failed" == "true" ]]; then
        log_error "Unit tests failed"
        return 1
    fi
    
    log_success "Unit tests completed"
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests..."
    
    local test_file="${PROJECT_ROOT}/tests/integration/api.test.js"
    if [[ -f "$test_file" ]]; then
        cd "$PROJECT_ROOT"
        
        # Set test environment
        export NODE_ENV="test"
        export TEST_MODE="integration"
        
        if ! timeout "$TEST_TIMEOUT" npm run test:integration; then
            log_error "Integration tests failed"
            return 1
        fi
    else
        log_warn "Integration test file not found: $test_file"
    fi
    
    log_success "Integration tests completed"
}

# Run end-to-end tests
run_e2e_tests() {
    log_info "Running end-to-end tests..."
    
    local test_file="${PROJECT_ROOT}/tests/e2e/user-journey.test.js"
    if [[ -f "$test_file" ]]; then
        cd "$PROJECT_ROOT"
        
        # Set test environment
        export NODE_ENV="test"
        export TEST_MODE="e2e"
        
        # Check if applications are running
        local frontend_url="${FRONTEND_URL:-http://localhost:3000}"
        local api_url="${API_URL:-http://localhost:3001}"
        
        log_info "Checking if applications are running..."
        if ! curl -f "$api_url/health" &> /dev/null; then
            log_warn "Backend API not running at $api_url, starting..."
            # Start backend API in background
            cd "${PROJECT_ROOT}/applications/backend-api"
            npm start &
            local api_pid=$!
            sleep 10
        fi
        
        if ! curl -f "$frontend_url" &> /dev/null; then
            log_warn "Frontend not running at $frontend_url, starting..."
            # Start frontend in background
            cd "${PROJECT_ROOT}/applications/frontend"
            npm start &
            local frontend_pid=$!
            sleep 15
        fi
        
        cd "$PROJECT_ROOT"
        
        if ! timeout "$TEST_TIMEOUT" npm run test:e2e; then
            log_error "End-to-end tests failed"
            
            # Cleanup background processes
            [[ -n "${api_pid:-}" ]] && kill "$api_pid" 2>/dev/null || true
            [[ -n "${frontend_pid:-}" ]] && kill "$frontend_pid" 2>/dev/null || true
            
            return 1
        fi
        
        # Cleanup background processes
        [[ -n "${api_pid:-}" ]] && kill "$api_pid" 2>/dev/null || true
        [[ -n "${frontend_pid:-}" ]] && kill "$frontend_pid" 2>/dev/null || true
    else
        log_warn "End-to-end test file not found: $test_file"
    fi
    
    log_success "End-to-end tests completed"
}

# Run performance tests
run_performance_tests() {
    log_info "Running performance tests..."
    
    local test_file="${PROJECT_ROOT}/tests/performance/load.test.js"
    if [[ -f "$test_file" ]]; then
        cd "$PROJECT_ROOT"
        
        # Set test environment
        export NODE_ENV="test"
        export TEST_MODE="performance"
        
        if ! timeout "$TEST_TIMEOUT" npm run test:performance; then
            log_error "Performance tests failed"
            return 1
        fi
    else
        log_warn "Performance test file not found: $test_file"
    fi
    
    log_success "Performance tests completed"
}

# Run security tests
run_security_tests() {
    log_info "Running security tests..."
    
    # Run npm audit
    log_info "Running npm audit..."
    local components=(
        "applications/frontend"
        "applications/backend-api"
        "applications/microservices/user-service"
    )
    
    local audit_failed=false
    
    for component in "${components[@]}"; do
        local component_path="${PROJECT_ROOT}/${component}"
        if [[ -f "${component_path}/package.json" ]]; then
            log_info "Running npm audit for $component..."
            cd "$component_path"
            
            if ! npm audit --audit-level=moderate; then
                log_error "npm audit failed for $component"
                audit_failed=true
                
                if [[ "$FAIL_FAST" == "true" ]]; then
                    break
                fi
            fi
        fi
    done
    
    # Run Trivy security scan if available
    if command -v trivy &> /dev/null; then
        log_info "Running Trivy security scan..."
        cd "$PROJECT_ROOT"
        
        if ! trivy fs . --exit-code 1 --severity HIGH,CRITICAL; then
            log_error "Trivy security scan failed"
            audit_failed=true
        fi
    else
        log_warn "Trivy not available, skipping filesystem security scan"
    fi
    
    # Run OWASP dependency check if available
    if command -v dependency-check &> /dev/null; then
        log_info "Running OWASP dependency check..."
        dependency-check --project "Project-5" --scan "$PROJECT_ROOT" --format JSON --out "${PROJECT_ROOT}/logs/"
    else
        log_warn "OWASP dependency-check not available"
    fi
    
    cd "$PROJECT_ROOT"
    
    if [[ "$audit_failed" == "true" ]]; then
        log_error "Security tests failed"
        return 1
    fi
    
    log_success "Security tests completed"
}

# Generate test report
generate_test_report() {
    if [[ "$GENERATE_REPORT" == "false" ]]; then
        log_info "Skipping test report generation"
        return 0
    fi
    
    log_info "Generating test report..."
    
    local report_file="${PROJECT_ROOT}/logs/test-report-$(date +%Y%m%d-%H%M%S).json"
    local coverage_file="${PROJECT_ROOT}/coverage/lcov.info"
    
    # Calculate overall coverage if available
    local coverage_percentage="unknown"
    if [[ -f "$coverage_file" ]] && command -v lcov &> /dev/null; then
        coverage_percentage=$(lcov --summary "$coverage_file" 2>/dev/null | grep "lines" | awk '{print $2}' | sed 's/%//' || echo "unknown")
    fi
    
    cat > "$report_file" << EOF
{
  "test": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "type": "$TEST_TYPE",
    "environment": "$ENVIRONMENT",
    "coverage": {
      "enabled": $COVERAGE,
      "threshold": $COVERAGE_THRESHOLD,
      "percentage": "$coverage_percentage"
    },
    "options": {
      "parallel": $PARALLEL,
      "verbose": $VERBOSE,
      "watch": $WATCH,
      "failFast": $FAIL_FAST,
      "timeout": $TEST_TIMEOUT
    },
    "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
  }
}
EOF
    
    log_info "Test report saved to: $report_file"
    
    # Generate HTML coverage report if available
    if [[ "$COVERAGE" == "true" ]] && [[ -f "$coverage_file" ]] && command -v genhtml &> /dev/null; then
        local html_report_dir="${PROJECT_ROOT}/coverage/html"
        mkdir -p "$html_report_dir"
        genhtml "$coverage_file" --output-directory "$html_report_dir"
        log_info "HTML coverage report generated: $html_report_dir/index.html"
    fi
}

# Cleanup test environment
cleanup_test_environment() {
    log_info "Cleaning up test environment..."
    
    # Stop test databases if they were started by this script
    if command -v docker &> /dev/null; then
        if docker ps | grep -q "test-postgres"; then
            docker stop test-postgres && docker rm test-postgres
            log_info "Stopped test PostgreSQL container"
        fi
        
        if docker ps | grep -q "test-redis"; then
            docker stop test-redis && docker rm test-redis
            log_info "Stopped test Redis container"
        fi
    fi
    
    # Clean up temporary test files
    find "$PROJECT_ROOT" -name "*.test.tmp" -delete 2>/dev/null || true
    
    log_success "Test environment cleanup completed"
}

# Main test function
main() {
    log_info "Starting Project-5 tests..."
    log_info "Test type: $TEST_TYPE"
    log_info "Environment: $ENVIRONMENT"
    log_info "Coverage: $COVERAGE"
    
    # Trap cleanup on exit
    trap cleanup_test_environment EXIT
    
    # Run test setup
    validate_environment
    setup_test_databases
    install_test_dependencies
    
    local test_failed=false
    
    # Run tests based on type
    case $TEST_TYPE in
        unit)
            run_unit_tests || test_failed=true
            ;;
        integration)
            run_integration_tests || test_failed=true
            ;;
        e2e)
            run_e2e_tests || test_failed=true
            ;;
        performance)
            run_performance_tests || test_failed=true
            ;;
        security)
            run_security_tests || test_failed=true
            ;;
        all)
            run_unit_tests || test_failed=true
            [[ "$test_failed" == "false" || "$FAIL_FAST" == "false" ]] && { run_integration_tests || test_failed=true; }
            [[ "$test_failed" == "false" || "$FAIL_FAST" == "false" ]] && { run_e2e_tests || test_failed=true; }
            [[ "$test_failed" == "false" || "$FAIL_FAST" == "false" ]] && { run_performance_tests || test_failed=true; }
            [[ "$test_failed" == "false" || "$FAIL_FAST" == "false" ]] && { run_security_tests || test_failed=true; }
            ;;
    esac
    
    # Generate test report
    generate_test_report
    
    if [[ "$test_failed" == "true" ]]; then
        log_error "Project-5 tests failed!"
        exit 1
    fi
    
    log_success "Project-5 tests completed successfully!"
    log_info "Test logs saved to: $LOG_FILE"
    
    # Display test summary
    echo
    echo "=== Test Summary ==="
    echo "Test Type: $TEST_TYPE"
    echo "Environment: $ENVIRONMENT"
    echo "Coverage: $COVERAGE"
    echo "Log File: $LOG_FILE"
    
    if [[ "$COVERAGE" == "true" ]] && [[ -d "${PROJECT_ROOT}/coverage" ]]; then
        echo "Coverage Report: ${PROJECT_ROOT}/coverage/"
    fi
}

# Parse arguments and run main function
parse_args "$@"
main