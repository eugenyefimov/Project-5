#!/bin/bash

# Project-5 Multi-Cloud Deployment Script
# Automates deployment across AWS, Azure, and GCP environments

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_ROOT}/logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# Default values
ENVIRONMENT="development"
CLOUD_PROVIDER="all"
DRY_RUN=false
VERBOSE=false
SKIP_TESTS=false
FORCE_DEPLOY=false
CONFIG_FILE="${PROJECT_ROOT}/config/deploy.yaml"

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
Project-5 Multi-Cloud Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV       Target environment (development, staging, production)
    -c, --cloud PROVIDER        Cloud provider (aws, azure, gcp, all)
    -d, --dry-run              Perform a dry run without making changes
    -v, --verbose              Enable verbose output
    -s, --skip-tests           Skip pre-deployment tests
    -f, --force                Force deployment even if checks fail
    --config FILE              Use custom configuration file
    -h, --help                 Show this help message

Examples:
    $0 --environment production --cloud aws
    $0 --environment staging --dry-run
    $0 --environment development --verbose
    $0 --cloud gcp --skip-tests

Environment Variables:
    KUBECONFIG                 Path to Kubernetes configuration
    AWS_PROFILE               AWS profile to use
    AZURE_SUBSCRIPTION_ID     Azure subscription ID
    GOOGLE_APPLICATION_CREDENTIALS  Path to GCP service account key
    DOCKER_REGISTRY           Docker registry URL
    IMAGE_TAG                 Docker image tag to deploy

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -c|--cloud)
                CLOUD_PROVIDER="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -s|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -f|--force)
                FORCE_DEPLOY=true
                shift
                ;;
            --config)
                CONFIG_FILE="$2"
                shift 2
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

# Validate environment
validate_environment() {
    log_info "Validating deployment environment..."
    
    # Check if environment is valid
    case $ENVIRONMENT in
        development|staging|production)
            log_info "Environment: $ENVIRONMENT"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    # Check if cloud provider is valid
    case $CLOUD_PROVIDER in
        aws|azure|gcp|all)
            log_info "Cloud provider: $CLOUD_PROVIDER"
            ;;
        *)
            log_error "Invalid cloud provider: $CLOUD_PROVIDER"
            exit 1
            ;;
    esac
    
    # Create logs directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Check required tools
    local required_tools=("kubectl" "docker" "terraform" "helm")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    log_success "Environment validation completed"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check cloud provider credentials
    case $CLOUD_PROVIDER in
        aws|all)
            if [[ -z "${AWS_PROFILE:-}" ]] && [[ -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
                log_warn "AWS credentials not configured"
            fi
            ;;
        azure|all)
            if [[ -z "${AZURE_SUBSCRIPTION_ID:-}" ]]; then
                log_warn "Azure credentials not configured"
            fi
            ;;
        gcp|all)
            if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
                log_warn "GCP credentials not configured"
            fi
            ;;
    esac
    
    log_success "Prerequisites check completed"
}

# Run pre-deployment tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warn "Skipping pre-deployment tests"
        return 0
    fi
    
    log_info "Running pre-deployment tests..."
    
    # Run unit tests
    log_info "Running unit tests..."
    if [[ -f "${PROJECT_ROOT}/package.json" ]]; then
        cd "$PROJECT_ROOT"
        npm test || {
            log_error "Unit tests failed"
            [[ "$FORCE_DEPLOY" == "false" ]] && exit 1
        }
    fi
    
    # Run integration tests
    log_info "Running integration tests..."
    if [[ -f "${PROJECT_ROOT}/tests/integration/run.sh" ]]; then
        bash "${PROJECT_ROOT}/tests/integration/run.sh" || {
            log_error "Integration tests failed"
            [[ "$FORCE_DEPLOY" == "false" ]] && exit 1
        }
    fi
    
    # Run security scans
    log_info "Running security scans..."
    if command -v trivy &> /dev/null; then
        trivy fs "$PROJECT_ROOT" --exit-code 1 || {
            log_error "Security scan failed"
            [[ "$FORCE_DEPLOY" == "false" ]] && exit 1
        }
    fi
    
    log_success "Pre-deployment tests completed"
}

# Build and push Docker images
build_images() {
    log_info "Building and pushing Docker images..."
    
    local registry="${DOCKER_REGISTRY:-localhost:5000}"
    local tag="${IMAGE_TAG:-latest}"
    
    # Build frontend image
    log_info "Building frontend image..."
    if [[ "$DRY_RUN" == "false" ]]; then
        docker build -t "${registry}/project5-frontend:${tag}" "${PROJECT_ROOT}/applications/frontend"
        docker push "${registry}/project5-frontend:${tag}"
    fi
    
    # Build backend API image
    log_info "Building backend API image..."
    if [[ "$DRY_RUN" == "false" ]]; then
        docker build -t "${registry}/project5-backend-api:${tag}" "${PROJECT_ROOT}/applications/backend-api"
        docker push "${registry}/project5-backend-api:${tag}"
    fi
    
    # Build user service image
    log_info "Building user service image..."
    if [[ "$DRY_RUN" == "false" ]]; then
        docker build -t "${registry}/project5-user-service:${tag}" "${PROJECT_ROOT}/applications/microservices/user-service"
        docker push "${registry}/project5-user-service:${tag}"
    fi
    
    log_success "Docker images built and pushed"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    local providers=()
    case $CLOUD_PROVIDER in
        aws) providers=("aws") ;;
        azure) providers=("azure") ;;
        gcp) providers=("gcp") ;;
        all) providers=("aws" "azure" "gcp") ;;
    esac
    
    for provider in "${providers[@]}"; do
        log_info "Deploying $provider infrastructure..."
        
        local tf_dir="${PROJECT_ROOT}/infrastructure/terraform/${provider}"
        if [[ -d "$tf_dir" ]]; then
            cd "$tf_dir"
            
            # Initialize Terraform
            terraform init -backend-config="key=${ENVIRONMENT}/${provider}/terraform.tfstate"
            
            # Plan deployment
            terraform plan -var="environment=${ENVIRONMENT}" -out="${ENVIRONMENT}.tfplan"
            
            # Apply if not dry run
            if [[ "$DRY_RUN" == "false" ]]; then
                terraform apply "${ENVIRONMENT}.tfplan"
            fi
        else
            log_warn "Terraform directory not found: $tf_dir"
        fi
    done
    
    log_success "Infrastructure deployment completed"
}

# Deploy Kubernetes resources
deploy_kubernetes() {
    log_info "Deploying Kubernetes resources..."
    
    # Apply namespace
    kubectl apply -f "${PROJECT_ROOT}/infrastructure/kubernetes/namespace.yaml"
    
    # Apply RBAC policies
    kubectl apply -f "${PROJECT_ROOT}/security/policies/rbac-policies.yaml"
    
    # Apply network policies
    kubectl apply -f "${PROJECT_ROOT}/security/policies/network-policies.yaml"
    
    # Apply ConfigMaps and Secrets
    if [[ -d "${PROJECT_ROOT}/infrastructure/kubernetes/config" ]]; then
        kubectl apply -f "${PROJECT_ROOT}/infrastructure/kubernetes/config/"
    fi
    
    # Deploy applications
    kubectl apply -f "${PROJECT_ROOT}/infrastructure/kubernetes/deployments/"
    
    # Wait for deployments to be ready
    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment --all -n project-5
    
    log_success "Kubernetes deployment completed"
}

# Deploy with Helm
deploy_helm() {
    log_info "Deploying with Helm..."
    
    local chart_dir="${PROJECT_ROOT}/infrastructure/helm-charts"
    if [[ -d "$chart_dir" ]]; then
        # Update Helm dependencies
        helm dependency update "$chart_dir"
        
        # Deploy or upgrade
        if [[ "$DRY_RUN" == "false" ]]; then
            helm upgrade --install project-5 "$chart_dir" \
                --namespace project-5 \
                --create-namespace \
                --values "${chart_dir}/values-${ENVIRONMENT}.yaml" \
                --set image.tag="${IMAGE_TAG:-latest}" \
                --wait --timeout=10m
        else
            helm upgrade --install project-5 "$chart_dir" \
                --namespace project-5 \
                --create-namespace \
                --values "${chart_dir}/values-${ENVIRONMENT}.yaml" \
                --set image.tag="${IMAGE_TAG:-latest}" \
                --dry-run
        fi
    else
        log_warn "Helm chart directory not found: $chart_dir"
    fi
    
    log_success "Helm deployment completed"
}

# Run post-deployment tests
run_post_deployment_tests() {
    log_info "Running post-deployment tests..."
    
    # Wait for services to be ready
    sleep 30
    
    # Run health checks
    log_info "Running health checks..."
    if command -v curl &> /dev/null; then
        # Check frontend
        local frontend_url="http://$(kubectl get svc frontend -n project-5 -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
        if curl -f "$frontend_url" &> /dev/null; then
            log_success "Frontend health check passed"
        else
            log_error "Frontend health check failed"
        fi
        
        # Check backend API
        local api_url="http://$(kubectl get svc backend-api -n project-5 -o jsonpath='{.status.loadBalancer.ingress[0].ip}')/health"
        if curl -f "$api_url" &> /dev/null; then
            log_success "Backend API health check passed"
        else
            log_error "Backend API health check failed"
        fi
    fi
    
    # Run end-to-end tests
    if [[ -f "${PROJECT_ROOT}/tests/e2e/run.sh" ]]; then
        bash "${PROJECT_ROOT}/tests/e2e/run.sh" || {
            log_error "End-to-end tests failed"
            [[ "$FORCE_DEPLOY" == "false" ]] && exit 1
        }
    fi
    
    log_success "Post-deployment tests completed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Deploy Prometheus
    if [[ -f "${PROJECT_ROOT}/monitoring/prometheus/prometheus.yml" ]]; then
        kubectl create configmap prometheus-config \
            --from-file="${PROJECT_ROOT}/monitoring/prometheus/prometheus.yml" \
            -n monitoring --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    # Deploy Grafana dashboards
    if [[ -d "${PROJECT_ROOT}/monitoring/grafana/dashboards" ]]; then
        kubectl create configmap grafana-dashboards \
            --from-file="${PROJECT_ROOT}/monitoring/grafana/dashboards/" \
            -n monitoring --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    log_success "Monitoring setup completed"
}

# Cleanup function
cleanup() {
    log_info "Performing cleanup..."
    
    # Remove temporary files
    find "$PROJECT_ROOT" -name "*.tfplan" -delete
    
    # Clean up Docker images if needed
    if [[ "${CLEANUP_IMAGES:-false}" == "true" ]]; then
        docker system prune -f
    fi
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting Project-5 deployment..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Cloud Provider: $CLOUD_PROVIDER"
    log_info "Dry Run: $DRY_RUN"
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Run deployment steps
    validate_environment
    check_prerequisites
    run_tests
    build_images
    deploy_infrastructure
    deploy_kubernetes
    deploy_helm
    setup_monitoring
    run_post_deployment_tests
    
    log_success "Project-5 deployment completed successfully!"
    log_info "Deployment logs saved to: $LOG_FILE"
    
    # Display deployment information
    echo
    echo "=== Deployment Summary ==="
    echo "Environment: $ENVIRONMENT"
    echo "Cloud Provider: $CLOUD_PROVIDER"
    echo "Kubernetes Namespace: project-5"
    echo "Log File: $LOG_FILE"
    echo
    echo "=== Service URLs ==="
    kubectl get svc -n project-5 -o wide
    echo
    echo "=== Pod Status ==="
    kubectl get pods -n project-5
}

# Parse arguments and run main function
parse_args "$@"
main