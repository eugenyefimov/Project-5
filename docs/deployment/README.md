# Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying Project-5 across AWS, Azure, and GCP environments.

## Prerequisites

### Required Tools
- Docker >= 20.0
- Docker Compose >= 1.29
- Kubernetes CLI (kubectl) >= 1.21
- Terraform >= 1.0
- Helm >= 3.0
- Node.js >= 16.x
- Python >= 3.9

### Cloud CLI Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Authentication Setup

#### AWS
```bash
# Configure AWS credentials
aws configure
# Or use environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

#### Azure
```bash
# Login to Azure
az login
# Set subscription
az account set --subscription "your-subscription-id"
```

#### GCP
```bash
# Authenticate with GCP
gcloud auth login
gcloud config set project your-project-id
```

## Quick Start Deployment

### 1. Clone and Initialize
```bash
git clone https://github.com/eugenyefimov/Project-5.git
cd Project-5

# Initialize the project
./scripts/setup.sh
```

### 2. Development Environment
```bash
# Deploy local development environment
./scripts/deploy-dev.sh
```

### 3. Production Deployment
```bash
# Deploy to production
./scripts/deployment/deploy-production.sh
```

## Infrastructure Deployment

### AWS Deployment

1. **Configure Variables**
```bash
cd infrastructure/terraform/aws
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

2. **Deploy Infrastructure**
```bash
terraform init
terraform plan
terraform apply
```

3. **Configure kubectl**
```bash
aws eks update-kubeconfig --region us-east-1 --name project5-eks-cluster
```

### Azure Deployment

1. **Configure Variables**
```bash
cd infrastructure/terraform/azure
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

2. **Deploy Infrastructure**
```bash
terraform init
terraform plan
terraform apply
```

3. **Configure kubectl**
```bash
az aks get-credentials --resource-group project5-rg --name project5-aks-cluster
```

### GCP Deployment

1. **Configure Variables**
```bash
cd infrastructure/terraform/gcp
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

2. **Deploy Infrastructure**
```bash
terraform init
terraform plan
terraform apply
```

3. **Configure kubectl**
```bash
gcloud container clusters get-credentials project5-gke-cluster --region us-central1
```

## Application Deployment

### Using Helm Charts

1. **Add Helm Repositories**
```bash
helm repo add project5 ./infrastructure/helm-charts
helm repo update
```

2. **Deploy Applications**
```bash
# Deploy to AWS
helm install project5-aws project5/project5 \
  --namespace project5 \
  --create-namespace \
  --values infrastructure/helm-charts/project5/values-aws.yaml

# Deploy to Azure
helm install project5-azure project5/project5 \
  --namespace project5 \
  --create-namespace \
  --values infrastructure/helm-charts/project5/values-azure.yaml

# Deploy to GCP
helm install project5-gcp project5/project5 \
  --namespace project5 \
  --create-namespace \
  --values infrastructure/helm-charts/project5/values-gcp.yaml
```

### Manual Kubernetes Deployment

1. **Apply Kubernetes Manifests**
```bash
kubectl apply -f infrastructure/kubernetes/namespaces/
kubectl apply -f infrastructure/kubernetes/configmaps/
kubectl apply -f infrastructure/kubernetes/secrets/
kubectl apply -f infrastructure/kubernetes/deployments/
kubectl apply -f infrastructure/kubernetes/services/
kubectl apply -f infrastructure/kubernetes/ingress/
```

## Monitoring Setup

### Prometheus and Grafana

1. **Deploy Monitoring Stack**
```bash
# Using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values monitoring/prometheus/helm-values.yaml

# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --values monitoring/grafana/helm-values.yaml
```

2. **Configure Dashboards**
```bash
# Import custom dashboards
kubectl apply -f monitoring/grafana/dashboards/
```

### ELK Stack

1. **Deploy Elasticsearch**
```bash
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch \
  --namespace logging \
  --create-namespace \
  --values monitoring/elk-stack/elasticsearch-values.yaml
```

2. **Deploy Logstash and Kibana**
```bash
helm install logstash elastic/logstash \
  --namespace logging \
  --values monitoring/elk-stack/logstash-values.yaml

helm install kibana elastic/kibana \
  --namespace logging \
  --values monitoring/elk-stack/kibana-values.yaml
```

## Security Configuration

### HashiCorp Vault

1. **Deploy Vault**
```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --values security/vault/helm-values.yaml
```

2. **Initialize and Unseal**
```bash
kubectl exec -ti vault-0 -- vault operator init
kubectl exec -ti vault-0 -- vault operator unseal
```

### Service Mesh (Istio)

1. **Install Istio**
```bash
curl -L https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-*/bin:$PATH
istioctl install --set values.defaultRevision=default
```

2. **Enable Auto-injection**
```bash
kubectl label namespace project5 istio-injection=enabled
```

## Environment-Specific Configurations

### Development
- Single cluster deployment
- Reduced resource allocation
- Debug logging enabled
- Local storage for databases

### Staging
- Multi-cluster setup
- Production-like resource allocation
- Standard logging level
- Cloud-managed databases

### Production
- Full multi-cloud deployment
- High availability configuration
- Optimized resource allocation
- Enterprise security features

## Troubleshooting

### Common Issues

1. **Terraform State Lock**
```bash
# Force unlock if needed
terraform force-unlock <lock-id>
```

2. **Kubernetes Context Issues**
```bash
# List contexts
kubectl config get-contexts
# Switch context
kubectl config use-context <context-name>
```

3. **Helm Deployment Failures**
```bash
# Debug helm releases
helm list --all-namespaces
helm status <release-name> -n <namespace>
# Rollback if needed
helm rollback <release-name> <revision> -n <namespace>
```

### Health Checks

1. **Infrastructure Health**
```bash
# Check Terraform state
terraform show
# Verify cloud resources
aws eks describe-cluster --name project5-eks-cluster
az aks show --resource-group project5-rg --name project5-aks-cluster
gcloud container clusters describe project5-gke-cluster --region us-central1
```

2. **Application Health**
```bash
# Check pod status
kubectl get pods -n project5
# Check service endpoints
kubectl get endpoints -n project5
# Check ingress
kubectl get ingress -n project5
```

## Rollback Procedures

### Infrastructure Rollback
```bash
# Terraform rollback
terraform plan -destroy
terraform apply -destroy

# Or rollback to previous state
terraform state pull > current-state.json
terraform state push previous-state.json
```

### Application Rollback
```bash
# Helm rollback
helm rollback project5-aws <revision> -n project5

# Kubernetes rollback
kubectl rollout undo deployment/frontend -n project5
kubectl rollout undo deployment/backend-api -n project5
```

## Performance Optimization

### Resource Tuning
```bash
# Update resource requests/limits
kubectl patch deployment frontend -n project5 -p '{"spec":{"template":{"spec":{"containers":[{"name":"frontend","resources":{"requests":{"memory":"256Mi","cpu":"250m"},"limits":{"memory":"512Mi","cpu":"500m"}}}]}}}}'
```

### Auto-scaling Configuration
```bash
# Configure HPA
kubectl autoscale deployment frontend --cpu-percent=70 --min=2 --max=10 -n project5
```

## Maintenance Procedures

### Regular Updates
```bash
# Update Helm charts
helm repo update
helm upgrade project5-aws project5/project5 -n project5

# Update Kubernetes
kubectl apply -f infrastructure/kubernetes/ --recursive
```

### Backup Procedures
```bash
# Backup Kubernetes resources
kubectl get all -n project5 -o yaml > backup-$(date +%Y%m%d).yaml

# Backup Terraform state
aws s3 cp terraform.tfstate s3://your-backup-bucket/terraform-backup-$(date +%Y%m%d).tfstate
```
