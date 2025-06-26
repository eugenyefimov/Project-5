# Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide covers common issues, diagnostic procedures, and resolution strategies for Project-5's multi-cloud infrastructure.

## Quick Reference

### Emergency Contacts
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Cloud Support**: AWS, Azure, GCP support channels
- **Security Team**: security@company.com
- **DevOps Team**: devops@company.com

### Critical Commands

```bash
# Check cluster health
kubectl get nodes
kubectl get pods --all-namespaces

# View logs
kubectl logs -f deployment/backend-api
kubectl logs -f deployment/frontend

# Check services
kubectl get svc
kubectl describe svc backend-api

# Emergency scaling
kubectl scale deployment backend-api --replicas=5
```

## Infrastructure Issues

### Kubernetes Cluster Problems

#### Node Issues

**Problem**: Nodes showing as NotReady

```bash
# Diagnosis
kubectl get nodes
kubectl describe node <node-name>

# Check node logs
sudo journalctl -u kubelet -f

# Common solutions
# 1. Restart kubelet
sudo systemctl restart kubelet

# 2. Check disk space
df -h

# 3. Check memory usage
free -h

# 4. Drain and restart node
kubectl drain <node-name> --ignore-daemonsets
kubectl uncordon <node-name>
```

**Problem**: Pod scheduling failures

```bash
# Diagnosis
kubectl get pods -o wide
kubectl describe pod <pod-name>

# Check resource constraints
kubectl top nodes
kubectl top pods

# Check taints and tolerations
kubectl describe node <node-name> | grep Taints

# Solutions
# 1. Add resource requests/limits
# 2. Add node selectors or affinity rules
# 3. Scale cluster if needed
```

#### Networking Issues

**Problem**: Pod-to-pod communication failures

```bash
# Diagnosis
# Test connectivity between pods
kubectl exec -it <pod-name> -- ping <target-pod-ip>

# Check network policies
kubectl get networkpolicies
kubectl describe networkpolicy <policy-name>

# Check CNI plugin status
kubectl get pods -n kube-system | grep -E 'calico|flannel|weave'

# Solutions
# 1. Review and update network policies
# 2. Restart CNI pods
# 3. Check firewall rules
```

**Problem**: Service discovery issues

```bash
# Diagnosis
kubectl get svc
kubectl get endpoints
nslookup <service-name>.<namespace>.svc.cluster.local

# Check CoreDNS
kubectl get pods -n kube-system | grep coredns
kubectl logs -n kube-system deployment/coredns

# Solutions
# 1. Restart CoreDNS
kubectl rollout restart -n kube-system deployment/coredns

# 2. Check service selectors
kubectl describe svc <service-name>
```

### Cloud Provider Specific Issues

#### AWS EKS

**Problem**: EKS cluster access issues

```bash
# Update kubeconfig
aws eks update-kubeconfig --region <region> --name <cluster-name>

# Check IAM permissions
aws sts get-caller-identity
aws eks describe-cluster --name <cluster-name>

# Verify security groups
aws ec2 describe-security-groups --group-ids <sg-id>
```

**Problem**: Load balancer issues

```bash
# Check ALB controller
kubectl get pods -n kube-system | grep aws-load-balancer
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Check ingress
kubectl get ingress
kubectl describe ingress <ingress-name>
```

#### Azure AKS

**Problem**: AKS authentication issues

```bash
# Get credentials
az aks get-credentials --resource-group <rg> --name <cluster-name>

# Check Azure AD integration
az aks show --resource-group <rg> --name <cluster-name> --query aadProfile

# Verify RBAC
kubectl get clusterrolebindings
```

**Problem**: Azure networking issues

```bash
# Check Azure CNI
kubectl get pods -n kube-system | grep azure

# Verify subnet configuration
az network vnet subnet show --resource-group <rg> --vnet-name <vnet> --name <subnet>
```

#### GCP GKE

**Problem**: GKE cluster connectivity

```bash
# Get credentials
gcloud container clusters get-credentials <cluster-name> --zone <zone>

# Check cluster status
gcloud container clusters describe <cluster-name> --zone <zone>

# Verify firewall rules
gcloud compute firewall-rules list
```

## Application Issues

### Frontend Application

**Problem**: Frontend not loading

```bash
# Check pod status
kubectl get pods -l app=frontend
kubectl logs -f deployment/frontend

# Check service and ingress
kubectl get svc frontend
kubectl get ingress frontend

# Test locally
docker run -p 3000:80 project5-frontend
curl http://localhost:3000
```

**Problem**: API connection issues

```javascript
// Check environment variables
console.log('API URL:', process.env.REACT_APP_API_URL);

// Test API connectivity
fetch('/health')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('API Error:', error));
```

### Backend API

**Problem**: API server not responding

```bash
# Check pod status
kubectl get pods -l app=backend-api
kubectl logs -f deployment/backend-api

# Check health endpoint
kubectl port-forward svc/backend-api 8000:8000
curl http://localhost:8000/health

# Check resource usage
kubectl top pod -l app=backend-api
```

**Problem**: Database connection issues

```bash
# Check database connectivity
kubectl exec -it deployment/backend-api -- npm run db:test

# Check environment variables
kubectl get secret db-credentials -o yaml

# Test database directly
psql -h <db-host> -U <username> -d <database>
```

### Database Issues

**Problem**: Database performance issues

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**Problem**: Database connection pool exhaustion

```bash
# Check connection pool settings
kubectl get configmap backend-config -o yaml

# Monitor connections
kubectl exec -it deployment/backend-api -- node -e "
console.log('Pool stats:', pool.totalCount, pool.idleCount);
"
```

## Monitoring and Observability Issues

### Prometheus Issues

**Problem**: Metrics not being collected

```bash
# Check Prometheus targets
kubectl port-forward svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Check ServiceMonitor
kubectl get servicemonitor
kubectl describe servicemonitor <name>

# Verify metrics endpoint
curl http://<service>:8000/metrics
```

**Problem**: High memory usage in Prometheus

```bash
# Check retention settings
kubectl get prometheus -o yaml | grep retention

# Check storage usage
kubectl exec -it prometheus-0 -- df -h /prometheus

# Reduce retention or increase storage
kubectl patch prometheus prometheus --type='merge' -p='{"spec":{"retention":"7d"}}'
```

### Grafana Issues

**Problem**: Dashboards not loading

```bash
# Check Grafana logs
kubectl logs -f deployment/grafana

# Check data source connectivity
kubectl port-forward svc/grafana 3000:3000
# Visit http://localhost:3000 and test data sources

# Restart Grafana
kubectl rollout restart deployment/grafana
```

### ELK Stack Issues

**Problem**: Logs not appearing in Kibana

```bash
# Check Elasticsearch cluster health
kubectl port-forward svc/elasticsearch 9200:9200
curl http://localhost:9200/_cluster/health

# Check Logstash processing
kubectl logs -f deployment/logstash

# Check Filebeat agents
kubectl get pods -l app=filebeat
kubectl logs daemonset/filebeat
```

## Security Issues

### Certificate Problems

**Problem**: TLS certificate expired

```bash
# Check certificate expiration
kubectl get certificates
kubectl describe certificate <cert-name>

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Force certificate renewal
kubectl delete certificate <cert-name>
```

**Problem**: RBAC permission denied

```bash
# Check current user permissions
kubectl auth can-i --list

# Check specific permission
kubectl auth can-i create pods

# Check role bindings
kubectl get rolebindings,clusterrolebindings -o wide | grep <user>
```

### Secrets Management

**Problem**: Vault connectivity issues

```bash
# Check Vault status
kubectl exec -it vault-0 -- vault status

# Check Vault logs
kubectl logs -f vault-0

# Test Vault authentication
vault auth -method=kubernetes role=myapp
```

## Performance Issues

### High CPU Usage

```bash
# Identify high CPU pods
kubectl top pods --sort-by=cpu

# Check resource limits
kubectl describe pod <pod-name> | grep -A 5 Limits

# Scale horizontally
kubectl scale deployment <deployment> --replicas=5

# Update resource limits
kubectl patch deployment <deployment> -p='{"spec":{"template":{"spec":{"containers":[{"name":"<container>","resources":{"limits":{"cpu":"2"}}}]}}}}'
```

### High Memory Usage

```bash
# Check memory usage
kubectl top pods --sort-by=memory

# Check for memory leaks
kubectl exec -it <pod> -- ps aux --sort=-%mem

# Check OOMKilled events
kubectl get events --field-selector reason=OOMKilling
```

### Network Latency

```bash
# Test network latency
kubectl exec -it <pod> -- ping <target>

# Check network policies
kubectl get networkpolicies

# Monitor network traffic
kubectl exec -it <pod> -- netstat -i
```

## Disaster Recovery

### Backup and Restore

**Problem**: Backup failure

```bash
# Check backup job status
kubectl get jobs -n backup
kubectl logs job/backup-job

# Manual backup
kubectl exec -it postgres-0 -- pg_dump -U postgres mydb > backup.sql

# Restore from backup
kubectl exec -i postgres-0 -- psql -U postgres mydb < backup.sql
```

**Problem**: Cluster recovery

```bash
# Check etcd backup
kubectl get pods -n kube-system | grep etcd

# Restore etcd from backup
# (Follow cloud provider specific procedures)

# Verify cluster state
kubectl get nodes
kubectl get pods --all-namespaces
```

## Automation and Scripts

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "=== Cluster Health Check ==="

# Check nodes
echo "Nodes:"
kubectl get nodes

# Check critical pods
echo "\nCritical Pods:"
kubectl get pods -n kube-system
kubectl get pods -n monitoring
kubectl get pods -n default

# Check services
echo "\nServices:"
kubectl get svc

# Check ingress
echo "\nIngress:"
kubectl get ingress

# Test API health
echo "\nAPI Health:"
curl -s http://backend-api:8000/health | jq .
```

### Log Collection Script

```bash
#!/bin/bash
# collect-logs.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="logs_${TIMESTAMP}"

mkdir -p $LOG_DIR

# Collect pod logs
for pod in $(kubectl get pods -o name); do
    kubectl logs $pod > "$LOG_DIR/${pod//\//_}.log" 2>&1
done

# Collect events
kubectl get events --sort-by='.lastTimestamp' > "$LOG_DIR/events.log"

# Collect cluster info
kubectl cluster-info dump > "$LOG_DIR/cluster-info.log"

echo "Logs collected in $LOG_DIR"
```

## Escalation Procedures

### Severity Levels

**Critical (P1)**
- Complete service outage
- Security breach
- Data loss
- Response time: 15 minutes

**High (P2)**
- Partial service degradation
- Performance issues affecting users
- Response time: 1 hour

**Medium (P3)**
- Minor functionality issues
- Non-critical component failures
- Response time: 4 hours

**Low (P4)**
- Documentation updates
- Enhancement requests
- Response time: 24 hours

### Contact Matrix

| Issue Type | Primary Contact | Secondary Contact | Escalation |
|------------|----------------|-------------------|------------|
| Infrastructure | DevOps Team | Cloud Support | CTO |
| Application | Development Team | Tech Lead | Engineering Manager |
| Security | Security Team | CISO | CEO |
| Database | DBA Team | Infrastructure Team | CTO |

## Preventive Measures

### Regular Maintenance

```bash
# Weekly tasks
- Update security patches
- Review resource usage
- Check backup integrity
- Update documentation

# Monthly tasks
- Disaster recovery testing
- Security audit
- Performance optimization
- Capacity planning

# Quarterly tasks
- Architecture review
- Technology updates
- Training updates
- Process improvements
```

### Monitoring Alerts

```yaml
# Example alert rules
groups:
- name: critical-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: High error rate detected
      
  - alert: PodCrashLooping
    expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: Pod is crash looping
```

## Conclusion

This troubleshooting guide provides comprehensive coverage of common issues and their resolutions. Regular updates and team training ensure effective incident response and system reliability.

For additional support, consult the architecture documentation and contact the appropriate team based on the escalation procedures outlined above.