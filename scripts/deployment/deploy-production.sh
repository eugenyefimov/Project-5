#!/bin/bash

# Project-5 Production Deployment Script
# This script deploys the application to all three cloud providers (AWS, Azure, GCP)

set -e

# Configuration
PROJECT_NAME="project5"
ENVIRONMENT="production"
TERRAFORM_VERSION="1.5.0"
KUBECTL_VERSION="1.27.0"
HELM_VERSION="3.12.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if required tools are installed
    command -v terraform >/dev/null 2>&1 || error "Terraform is not installed"
    command -v kubectl >/dev/null 2>&1 || error "kubectl is not installed"
    command -v helm >/dev/null 2>&1 || error "Helm is not installed"
    command -v aws >/dev/null 2>&1 || error "AWS CLI is not installed"
    command -v az >/dev/null 2>&1 || error "Azure CLI is not installed"
    command -v gcloud >/dev/null 2>&1 || error "Google Cloud CLI is not installed"
    
    # Check authentication
    aws sts get-caller-identity >/dev/null 2>&1 || error "AWS authentication failed"
    az account show >/dev/null 2>&1 || error "Azure authentication failed"
    gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 >/dev/null 2>&1 || error "GCP authentication failed"
    
    log "✅ All prerequisites met"
}

# Deploy infrastructure to AWS
deploy_aws() {
    log "🚀 Deploying AWS infrastructure..."
    
    cd infrastructure/terraform/aws
    
    # Initialize Terraform
    terraform init
    
    # Create workspace if it doesn't exist
    terraform workspace select $ENVIRONMENT || terraform workspace new $ENVIRONMENT
    
    # Plan deployment
    terraform plan \
        -var="environment=$ENVIRONMENT" \
        -var="project_name=$PROJECT_NAME" \
        -out=tfplan
    
    # Apply deployment
    terraform apply tfplan
    
    # Save outputs
    terraform output -json > ../../../outputs/aws-outputs.json
    
    cd ../../..
    
    log "✅ AWS infrastructure deployed successfully"
}

# Deploy infrastructure to Azure
deploy_azure() {
    log "🚀 Deploying Azure infrastructure..."
    
    cd infrastructure/terraform/azure
    
    # Initialize Terraform
    terraform init
    
    # Create workspace if it doesn't exist
    terraform workspace select $ENVIRONMENT || terraform workspace new $ENVIRONMENT
    
    # Plan deployment
    terraform plan \
        -var="environment=$ENVIRONMENT" \
        -var="project_name=$PROJECT_NAME" \
        -out=tfplan
    
    # Apply deployment
    terraform apply tfplan
    
    # Save outputs
    terraform output -json > ../../../outputs/azure-outputs.json
    
    cd ../../..
    
    log "✅ Azure infrastructure deployed successfully"
}

# Deploy infrastructure to GCP
deploy_gcp() {
    log "🚀 Deploying GCP infrastructure..."
    
    cd infrastructure/terraform/gcp
    
    # Initialize Terraform
    terraform init
    
    # Create workspace if it doesn't exist
    terraform workspace select $ENVIRONMENT || terraform workspace new $ENVIRONMENT
    
    # Plan deployment
    terraform plan \
        -var="environment=$ENVIRONMENT" \
        -var="project_name=$PROJECT_NAME" \
        -out=tfplan
    
    # Apply deployment
    terraform apply tfplan
    
    # Save outputs
    terraform output -json > ../../../outputs/gcp-outputs.json
    
    cd ../../..
    
    log "✅ GCP infrastructure deployed successfully"
}

# Configure Kubernetes contexts
configure_k8s_contexts() {
    log "⚙️  Configuring Kubernetes contexts..."
    
    # AWS EKS
    aws eks update-kubeconfig --region us-west-2 --name ${PROJECT_NAME}-eks --alias aws-${ENVIRONMENT}
    
    # Azure AKS
    az aks get-credentials --resource-group ${PROJECT_NAME}-${ENVIRONMENT} --name ${PROJECT_NAME}-aks --context azure-${ENVIRONMENT}
    
    # GCP GKE
    gcloud container clusters get-credentials ${PROJECT_NAME}-gke --zone us-central1-a --project ${GCP_PROJECT_ID}
    kubectl config rename-context gke_${GCP_PROJECT_ID}_us-central1-a_${PROJECT_NAME}-gke gcp-${ENVIRONMENT}
    
    # Verify contexts
    kubectl config get-contexts
    
    log "✅ Kubernetes contexts configured"
}

# Deploy applications to Kubernetes
deploy_applications() {
    log "📦 Deploying applications..."
    
    # Create outputs directory if it doesn't exist
    mkdir -p outputs
    
    # Deploy to AWS cluster
    log "Deploying to AWS EKS cluster..."
    kubectl --context=aws-${ENVIRONMENT} apply -f infrastructure/kubernetes/namespace.yaml
    kubectl --context=aws-${ENVIRONMENT} apply -f infrastructure/kubernetes/configmap.yaml
    kubectl --context=aws-${ENVIRONMENT} apply -f infrastructure/kubernetes/secrets.yaml
    kubectl --context=aws-${ENVIRONMENT} apply -f infrastructure/kubernetes/
    
    # Deploy to Azure cluster
    log "Deploying to Azure AKS cluster..."
    kubectl --context=azure-${ENVIRONMENT} apply -f infrastructure/kubernetes/namespace.yaml
    kubectl --context=azure-${ENVIRONMENT} apply -f infrastructure/kubernetes/configmap.yaml
    kubectl --context=azure-${ENVIRONMENT} apply -f infrastructure/kubernetes/secrets.yaml
    kubectl --context=azure-${ENVIRONMENT} apply -f infrastructure/kubernetes/
    
    # Deploy to GCP cluster
    log "Deploying to GCP GKE cluster..."
    kubectl --context=gcp-${ENVIRONMENT} apply -f infrastructure/kubernetes/namespace.yaml
    kubectl --context=gcp-${ENVIRONMENT} apply -f infrastructure/kubernetes/configmap.yaml
    kubectl --context=gcp-${ENVIRONMENT} apply -f infrastructure/kubernetes/secrets.yaml
    kubectl --context=gcp-${ENVIRONMENT} apply -f infrastructure/kubernetes/
    
    log "✅ Applications deployed to all clusters"
}

# Deploy monitoring stack
deploy_monitoring() {
    log "📊 Deploying monitoring stack..."
    
    # Add Helm repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo add elastic https://helm.elastic.co
    helm repo update
    
    # Deploy Prometheus to each cluster
    for context in aws-${ENVIRONMENT} azure-${ENVIRONMENT} gcp-${ENVIRONMENT}; do
        log "Deploying Prometheus to $context..."
        
        # Create monitoring namespace
        kubectl --context=$context create namespace monitoring --dry-run=client -o yaml | kubectl --context=$context apply -f -
        
        # Deploy Prometheus
        helm --kube-context=$context upgrade --install prometheus prometheus-community/kube-prometheus-stack \
            --namespace monitoring \
            --values monitoring/prometheus/values-${ENVIRONMENT}.yaml \
            --set prometheus.prometheusSpec.externalLabels.cluster=$context
        
        # Deploy Grafana
        helm --kube-context=$context upgrade --install grafana grafana/grafana \
            --namespace monitoring \
            --values monitoring/grafana/values-${ENVIRONMENT}.yaml
        
        # Deploy ELK Stack
        helm --kube-context=$context upgrade --install elasticsearch elastic/elasticsearch \
            --namespace monitoring \
            --values monitoring/elk-stack/elasticsearch-values.yaml
        
        helm --kube-context=$context upgrade --install kibana elastic/kibana \
            --namespace monitoring \
            --values monitoring/elk-stack/kibana-values.yaml
        
        helm --kube-context=$context upgrade --install logstash elastic/logstash \
            --namespace monitoring \
            --values monitoring/elk-stack/logstash-values.yaml
    done
    
    log "✅ Monitoring stack deployed"
}

# Verify deployment
verify_deployment() {
    log "🔍 Verifying deployment..."
    
    for context in aws-${ENVIRONMENT} azure-${ENVIRONMENT} gcp-${ENVIRONMENT}; do
        info "Checking $context cluster..."
        
        # Check if all pods are running
        kubectl --context=$context get pods --all-namespaces
        
        # Wait for deployments to be ready
        kubectl --context=$context wait --for=condition=available --timeout=300s deployment/frontend
        kubectl --context=$context wait --for=condition=available --timeout=300s deployment/backend-api
        
        # Check service endpoints
        kubectl --context=$context get services
        
        # Run health checks
        if kubectl --context=$context get ingress frontend-ingress >/dev/null 2>&1; then
            FRONTEND_URL=$(kubectl --context=$context get ingress frontend-ingress -o jsonpath='{.spec.rules[0].host}')
            curl -f "https://$FRONTEND_URL/health" || warn "Frontend health check failed for $context"
        fi
        
        if kubectl --context=$context get ingress api-ingress >/dev/null 2>&1; then
            API_URL=$(kubectl --context=$context get ingress api-ingress -o jsonpath='{.spec.rules[0].host}')
            curl -f "https://$API_URL/health" || warn "API health check failed for $context"
        fi
    done
    
    log "✅ Deployment verification completed"
}

# Setup global load balancer
setup_global_load_balancer() {
    log "🌐 Setting up global load balancer..."
    
    # This would typically involve setting up a global load balancer
    # like AWS Global Accelerator, Azure Traffic Manager, or GCP Global Load Balancer
    # For this example, we'll create configuration files
    
    cat > outputs/global-lb-config.yaml << EOF
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: ${PROJECT_NAME}-ssl-cert
spec:
  domains:
    - ${PROJECT_NAME}.example.com
    - api.${PROJECT_NAME}.example.com
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: global-ingress
  annotations:
    kubernetes.io/ingress.global-static-ip-name: ${PROJECT_NAME}-global-ip
    networking.gke.io/managed-certificates: ${PROJECT_NAME}-ssl-cert
    kubernetes.io/ingress.class: "gce"
spec:
  rules:
  - host: ${PROJECT_NAME}.example.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.${PROJECT_NAME}.example.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: backend-api-service
            port:
              number: 80
EOF
    
    # Apply global load balancer configuration
    kubectl --context=gcp-${ENVIRONMENT} apply -f outputs/global-lb-config.yaml
    
    log "✅ Global load balancer configured"
}

# Backup current state
backup_state() {
    log "💾 Backing up current state..."
    
    # Create backup directory
    BACKUP_DIR="backups/$(date +'%Y%m%d_%H%M%S')"
    mkdir -p "$BACKUP_DIR"
    
    # Backup Terraform state files
    cp -r infrastructure/terraform/*/terraform.tfstate* "$BACKUP_DIR/" 2>/dev/null || true
    
    # Backup Kubernetes configurations
    for context in aws-${ENVIRONMENT} azure-${ENVIRONMENT} gcp-${ENVIRONMENT}; do
        kubectl --context=$context get all --all-namespaces -o yaml > "$BACKUP_DIR/k8s-${context}.yaml"
    done
    
    # Backup monitoring configurations
    cp -r monitoring/ "$BACKUP_DIR/"
    
    log "✅ State backed up to $BACKUP_DIR"
}

# Main deployment function
main() {
    log "🚀 Starting Project-5 production deployment..."
    
    # Create necessary directories
    mkdir -p outputs backups logs
    
    # Redirect output to log file
    exec > >(tee -a "logs/deployment-$(date +'%Y%m%d_%H%M%S').log") 2>&1
    
    # Run deployment steps
    check_prerequisites
    backup_state
    
    # Deploy infrastructure
    deploy_aws
    deploy_azure
    deploy_gcp
    
    # Configure Kubernetes
    configure_k8s_contexts
    
    # Deploy applications
    deploy_applications
    
    # Deploy monitoring
    deploy_monitoring
    
    # Setup global services
    setup_global_load_balancer
    
    # Verify everything is working
    verify_deployment
    
    log "🎉 Production deployment completed successfully!"
    log "📊 Dashboard URLs:"
    log "   - Frontend: https://${PROJECT_NAME}.example.com"
    log "   - API: https://api.${PROJECT_NAME}.example.com"
    log "   - Grafana: Check your cluster ingress for Grafana URLs"
    log "   - Kibana: Check your cluster ingress for Kibana URLs"
}

# Cleanup function for errors
cleanup() {
    if [ $? -ne 0 ]; then
        error "Deployment failed! Check the logs for details."
        warn "You may need to manually clean up partially deployed resources."
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"
