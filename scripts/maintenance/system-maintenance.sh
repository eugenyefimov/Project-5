#!/bin/bash
# Project-5 System Maintenance Script
# Performs routine maintenance tasks across all cloud environments

set -e

# Configuration
PROJECT_NAME="project5"
BACKUP_RETENTION_DAYS=30
LOG_RETENTION_DAYS=7
METRICS_RETENTION_DAYS=15

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
    
    # Check required tools
    local required_tools=("kubectl" "helm" "aws" "az" "gcloud")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            warn "$tool is not installed or not in PATH"
        fi
    done
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        warn "Cannot connect to Kubernetes cluster"
    fi
    
    log "Prerequisites check completed"
}

# Clean up old logs
cleanup_logs() {
    log "Cleaning up old logs..."
    
    # Clean application logs
    kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{"\n"}{end}' | \
    while read namespace pod; do
        if [[ -n "$namespace" && -n "$pod" ]]; then
            # Rotate logs for pods older than retention period
            kubectl logs "$pod" -n "$namespace" --since="${LOG_RETENTION_DAYS}d" > /dev/null 2>&1 || true
        fi
    done
    
    # Clean monitoring logs
    kubectl exec -n monitoring deployment/elasticsearch -- \
        curl -X DELETE "localhost:9200/logstash-$(date -d "$LOG_RETENTION_DAYS days ago" +%Y.%m.%d)" || true
    
    log "Log cleanup completed"
}

# Clean up old metrics
cleanup_metrics() {
    log "Cleaning up old metrics..."
    
    # Clean Prometheus metrics older than retention period
    kubectl exec -n monitoring deployment/prometheus-server -- \
        promtool query instant 'prometheus_tsdb_retention_limit_bytes' || true
    
    # Clean Grafana annotations older than retention period
    kubectl exec -n monitoring deployment/grafana -- \
        sqlite3 /var/lib/grafana/grafana.db \
        "DELETE FROM annotation WHERE created < datetime('now', '-${METRICS_RETENTION_DAYS} days');" || true
    
    log "Metrics cleanup completed"
}

# Backup databases
backup_databases() {
    log "Backing up databases..."
    
    local backup_date=$(date +%Y%m%d_%H%M%S)
    
    # PostgreSQL backup
    kubectl get pods -l app=postgresql --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{"\n"}{end}' | \
    while read namespace pod; do
        if [[ -n "$namespace" && -n "$pod" ]]; then
            kubectl exec "$pod" -n "$namespace" -- \
                pg_dumpall -U postgres > "backup_${namespace}_${backup_date}.sql" || true
        fi
    done
    
    # Redis backup
    kubectl get pods -l app=redis --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{"\n"}{end}' | \
    while read namespace pod; do
        if [[ -n "$namespace" && -n "$pod" ]]; then
            kubectl exec "$pod" -n "$namespace" -- \
                redis-cli BGSAVE || true
        fi
    done
    
    log "Database backup completed"
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Remove local backup files older than retention period
    find . -name "backup_*.sql" -mtime +"$BACKUP_RETENTION_DAYS" -delete || true
    find . -name "backup_*.rdb" -mtime +"$BACKUP_RETENTION_DAYS" -delete || true
    
    # AWS S3 backup cleanup
    if command -v aws &> /dev/null; then
        aws s3 ls s3://project5-backups/ --recursive | \
        awk '{print $4}' | \
        while read file; do
            file_date=$(echo "$file" | grep -o '[0-9]\{8\}_[0-9]\{6\}' | head -1)
            if [[ -n "$file_date" ]]; then
                file_timestamp=$(date -d "${file_date:0:8} ${file_date:9:2}:${file_date:11:2}:${file_date:13:2}" +%s)
                cutoff_timestamp=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%s)
                if [[ "$file_timestamp" -lt "$cutoff_timestamp" ]]; then
                    aws s3 rm "s3://project5-backups/$file" || true
                fi
            fi
        done
    fi
    
    log "Old backup cleanup completed"
}

# Update container images
update_images() {
    log "Updating container images..."
    
    # Get all deployments
    kubectl get deployments --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{"\n"}{end}' | \
    while read namespace deployment; do
        if [[ -n "$namespace" && -n "$deployment" ]]; then
            # Restart deployment to pull latest images
            kubectl rollout restart deployment "$deployment" -n "$namespace" || true
            
            # Wait for rollout to complete
            kubectl rollout status deployment "$deployment" -n "$namespace" --timeout=300s || true
        fi
    done
    
    log "Image updates completed"
}

# Check resource usage
check_resource_usage() {
    log "Checking resource usage..."
    
    # Node resource usage
    info "Node Resource Usage:"
    kubectl top nodes || warn "Metrics server not available"
    
    # Pod resource usage
    info "\nTop Resource Consuming Pods:"
    kubectl top pods --all-namespaces --sort-by=cpu | head -10 || warn "Metrics server not available"
    
    # Storage usage
    info "\nPersistent Volume Usage:"
    kubectl get pv -o custom-columns=NAME:.metadata.name,CAPACITY:.spec.capacity.storage,STATUS:.status.phase,CLAIM:.spec.claimRef.name
    
    # Check for pods with high restart counts
    info "\nPods with High Restart Counts:"
    kubectl get pods --all-namespaces --field-selector=status.phase=Running -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount | \
    awk 'NR>1 && $3>5 {print $0}'
    
    log "Resource usage check completed"
}

# Security scan
security_scan() {
    log "Running security scan..."
    
    # Scan container images for vulnerabilities
    if command -v trivy &> /dev/null; then
        kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | \
        sort -u | \
        while read image; do
            if [[ -n "$image" ]]; then
                info "Scanning image: $image"
                trivy image "$image" --severity HIGH,CRITICAL --quiet || true
            fi
        done
    else
        warn "Trivy not installed, skipping image vulnerability scan"
    fi
    
    # Check for security policy violations
    kubectl get pods --all-namespaces -o json | \
    jq -r '.items[] | select(.spec.securityContext.runAsRoot == true or .spec.securityContext.runAsUser == 0) | "\(.metadata.namespace)/\(.metadata.name) is running as root"' || true
    
    log "Security scan completed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check cluster health
    kubectl get nodes -o wide
    kubectl get componentstatuses || true
    
    # Check critical services
    local critical_namespaces=("kube-system" "monitoring" "default")
    
    for namespace in "${critical_namespaces[@]}"; do
        info "\nChecking namespace: $namespace"
        kubectl get pods -n "$namespace" --field-selector=status.phase!=Running,status.phase!=Succeeded
    done
    
    # Check ingress controllers
    kubectl get ingress --all-namespaces
    
    # Check persistent volumes
    kubectl get pv | grep -v Available | grep -v Bound || true
    
    log "Health check completed"
}

# Generate maintenance report
generate_report() {
    log "Generating maintenance report..."
    
    local report_file="maintenance_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Project-5 Maintenance Report"
        echo "Generated: $(date)"
        echo "=============================="
        echo ""
        
        echo "Cluster Information:"
        kubectl cluster-info
        echo ""
        
        echo "Node Status:"
        kubectl get nodes
        echo ""
        
        echo "Namespace Summary:"
        kubectl get namespaces
        echo ""
        
        echo "Resource Usage Summary:"
        kubectl top nodes || echo "Metrics server not available"
        echo ""
        
        echo "Storage Summary:"
        kubectl get pv
        echo ""
        
        echo "Recent Events:"
        kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -20
        
    } > "$report_file"
    
    info "Maintenance report saved to: $report_file"
    
    log "Report generation completed"
}

# Main maintenance function
run_maintenance() {
    local maintenance_type="${1:-full}"
    
    case "$maintenance_type" in
        "quick")
            log "Running quick maintenance..."
            check_prerequisites
            health_check
            check_resource_usage
            ;;
        "cleanup")
            log "Running cleanup maintenance..."
            check_prerequisites
            cleanup_logs
            cleanup_metrics
            cleanup_old_backups
            ;;
        "security")
            log "Running security maintenance..."
            check_prerequisites
            security_scan
            ;;
        "full")
            log "Running full maintenance..."
            check_prerequisites
            health_check
            check_resource_usage
            cleanup_logs
            cleanup_metrics
            backup_databases
            cleanup_old_backups
            security_scan
            generate_report
            ;;
        *)
            error "Unknown maintenance type: $maintenance_type. Use: quick, cleanup, security, or full"
            ;;
    esac
}

# Display usage information
show_usage() {
    echo "Usage: $0 [maintenance_type]"
    echo ""
    echo "Maintenance types:"
    echo "  quick    - Quick health check and resource usage"
    echo "  cleanup  - Clean up logs, metrics, and old backups"
    echo "  security - Run security scans and checks"
    echo "  full     - Run all maintenance tasks (default)"
    echo ""
    echo "Examples:"
    echo "  $0 quick"
    echo "  $0 cleanup"
    echo "  $0 security"
    echo "  $0 full"
}

# Main execution
main() {
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_usage
        exit 0
    fi
    
    log "Starting Project-5 system maintenance..."
    
    run_maintenance "$1"
    
    log "System maintenance completed successfully!"
}

# Execute main function
main "$@"