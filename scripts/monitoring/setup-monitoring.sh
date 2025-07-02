#!/bin/bash
# Project-5 Monitoring Setup Script
# Sets up comprehensive monitoring stack across all cloud providers

set -e

# Configuration
PROJECT_NAME="project5"
MONITORING_NAMESPACE="monitoring"
PROMETHEUS_VERSION="2.45.0"
GRAFANA_VERSION="10.0.0"
ELK_VERSION="8.8.0"
JAEGER_VERSION="1.47.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        error "helm is not installed or not in PATH"
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi
    
    log "Prerequisites check completed"
}

# Create monitoring namespace
create_namespace() {
    log "Creating monitoring namespace..."
    
    kubectl create namespace $MONITORING_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    log "Monitoring namespace created/updated"
}

# Setup Prometheus
setup_prometheus() {
    log "Setting up Prometheus..."
    
    # Add Prometheus Helm repository
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Install/upgrade Prometheus
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace $MONITORING_NAMESPACE \
        --version $PROMETHEUS_VERSION \
        --values ../../monitoring/prometheus/prometheus.yml \
        --wait
    
    log "Prometheus setup completed"
}

# Setup Grafana
setup_grafana() {
    log "Setting up Grafana..."
    
    # Grafana is included in kube-prometheus-stack
    # Import custom dashboards
    kubectl create configmap grafana-dashboards \
        --from-file=../../monitoring/grafana/dashboards/ \
        --namespace $MONITORING_NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log "Grafana setup completed"
}

# Setup ELK Stack
setup_elk() {
    log "Setting up ELK Stack..."
    
    # Add Elastic Helm repository
    helm repo add elastic https://helm.elastic.co
    helm repo update
    
    # Install Elasticsearch
    helm upgrade --install elasticsearch elastic/elasticsearch \
        --namespace $MONITORING_NAMESPACE \
        --version $ELK_VERSION \
        --values ../../monitoring/elk-stack/elasticsearch-values.yaml \
        --wait
    
    # Install Kibana
    helm upgrade --install kibana elastic/kibana \
        --namespace $MONITORING_NAMESPACE \
        --version $ELK_VERSION \
        --wait
    
    # Install Logstash
    helm upgrade --install logstash elastic/logstash \
        --namespace $MONITORING_NAMESPACE \
        --version $ELK_VERSION \
        --wait
    
    log "ELK Stack setup completed"
}

# Setup Jaeger
setup_jaeger() {
    log "Setting up Jaeger..."
    
    # Add Jaeger Helm repository
    helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
    helm repo update
    
    # Install Jaeger
    helm upgrade --install jaeger jaegertracing/jaeger \
        --namespace $MONITORING_NAMESPACE \
        --version $JAEGER_VERSION \
        --values ../../monitoring/jaeger/jaeger-values.yaml \
        --wait
    
    log "Jaeger setup completed"
}

# Configure monitoring for applications
configure_app_monitoring() {
    log "Configuring application monitoring..."
    
    # Apply ServiceMonitor for applications
    kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: project5-apps
  namespace: $MONITORING_NAMESPACE
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: project5
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
EOF
    
    log "Application monitoring configured"
}

# Setup alerting rules
setup_alerting() {
    log "Setting up alerting rules..."
    
    kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: project5-alerts
  namespace: $MONITORING_NAMESPACE
spec:
  groups:
  - name: project5.rules
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: High error rate detected
        description: "Error rate is {{ \$value }} errors per second"
    
    - alert: HighLatency
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: High latency detected
        description: "95th percentile latency is {{ \$value }} seconds"
    
    - alert: PodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: Pod is crash looping
        description: "Pod {{ \$labels.pod }} in namespace {{ \$labels.namespace }} is crash looping"
EOF
    
    log "Alerting rules configured"
}

# Display access information
display_access_info() {
    log "Monitoring stack deployment completed!"
    
    info "Access Information:"
    
    # Prometheus
    echo "Prometheus:"
    kubectl get svc -n $MONITORING_NAMESPACE | grep prometheus-server || true
    
    # Grafana
    echo "\nGrafana:"
    kubectl get svc -n $MONITORING_NAMESPACE | grep grafana || true
    echo "Default Grafana credentials: admin/admin"
    
    # Kibana
    echo "\nKibana:"
    kubectl get svc -n $MONITORING_NAMESPACE | grep kibana || true
    
    # Jaeger
    echo "\nJaeger:"
    kubectl get svc -n $MONITORING_NAMESPACE | grep jaeger-query || true
    
    info "Use 'kubectl port-forward' to access services locally"
    info "Example: kubectl port-forward -n $MONITORING_NAMESPACE svc/prometheus-server 9090:80"
}

# Main execution
main() {
    log "Starting Project-5 monitoring setup..."
    
    check_prerequisites
    create_namespace
    setup_prometheus
    setup_grafana
    setup_elk
    setup_jaeger
    configure_app_monitoring
    setup_alerting
    display_access_info
    
    log "Monitoring setup completed successfully!"
}

# Execute main function
main "$@"