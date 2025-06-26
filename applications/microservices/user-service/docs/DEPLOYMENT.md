# User Service Deployment Guide

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Production Deployment](#production-deployment)
- [Monitoring & Observability](#monitoring--observability)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

## 🌐 Overview

This guide provides comprehensive instructions for deploying the User Service across different environments including development, staging, and production. The service supports multiple deployment strategies including Docker containers, Kubernetes orchestration, and traditional server deployments.

### Deployment Strategies

- **Development**: Docker Compose for local development
- **Staging**: Kubernetes with staging configurations
- **Production**: Kubernetes with high availability and security
- **CI/CD**: Automated deployments with GitHub Actions

## 📋 Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores
- **Memory**: 4GB RAM
- **Storage**: 20GB available space
- **Network**: Stable internet connection

#### Recommended Requirements
- **CPU**: 4+ cores
- **Memory**: 8GB+ RAM
- **Storage**: 50GB+ SSD
- **Network**: High-speed internet connection

### Software Dependencies

#### Required
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Docker**: v20.10.0 or higher
- **Docker Compose**: v2.0.0 or higher

#### For Kubernetes Deployment
- **kubectl**: v1.24.0 or higher
- **Helm**: v3.8.0 or higher
- **Kubernetes cluster**: v1.24.0 or higher

#### Database Requirements
- **PostgreSQL**: v13.0 or higher
- **Redis**: v6.0 or higher

### External Services

- **Email Service**: SMTP server or email service provider
- **Monitoring**: Prometheus and Grafana (optional)
- **Logging**: ELK Stack or similar (optional)
- **Secret Management**: HashiCorp Vault or Kubernetes secrets

## 🔧 Environment Setup

### Environment Variables

Create environment-specific configuration files:

#### Development (.env.development)

```bash
# Application
NODE_ENV=development
PORT=3000
HOST=localhost
API_PREFIX=/api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=user_service_dev
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_FROM=noreply@localhost
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

#### Staging (.env.staging)

```bash
# Application
NODE_ENV=staging
PORT=3000
HOST=0.0.0.0
API_PREFIX=/api/v1

# Database
DB_HOST=postgres-staging.internal
DB_PORT=5432
DB_NAME=user_service_staging
DB_USER=user_service
DB_PASSWORD=${DB_PASSWORD}
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=redis-staging.internal
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_FROM=noreply@staging.project5.com
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=587
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
SMTP_SECURE=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
HEALTH_CHECK_ENABLED=true

# Security
CORS_ORIGIN=https://staging.project5.com
TRUST_PROXY=true
SECURE_COOKIES=true
```

#### Production (.env.production)

```bash
# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
API_PREFIX=/api/v1

# Database
DB_HOST=${DB_HOST}
DB_PORT=5432
DB_NAME=user_service_prod
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_CONNECTION_TIMEOUT=30000

# Redis
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_CLUSTER_MODE=true

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_FROM=noreply@project5.com
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=587
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
SMTP_SECURE=true

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_FILE=/var/log/user-service/app.log

# Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
HEALTH_CHECK_ENABLED=true
APM_ENABLED=true
SENTRY_DSN=${SENTRY_DSN}

# Security
CORS_ORIGIN=https://project5.com,https://app.project5.com
TRUST_PROXY=true
SECURE_COOKIES=true
CSP_ENABLED=true
HSTS_ENABLED=true

# Performance
COMPRESSION_ENABLED=true
KEEP_ALIVE_TIMEOUT=65000
HEADERS_TIMEOUT=66000
```

### Secret Management

#### Using Kubernetes Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: user-service-secrets
  namespace: user-service
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-secret>
  JWT_REFRESH_SECRET: <base64-encoded-secret>
  SMTP_PASS: <base64-encoded-password>
  SENTRY_DSN: <base64-encoded-dsn>
```

```bash
# Create secrets
kubectl apply -f secrets.yaml

# Or create from command line
kubectl create secret generic user-service-secrets \
  --from-literal=DB_PASSWORD=your-db-password \
  --from-literal=REDIS_PASSWORD=your-redis-password \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --namespace=user-service
```

## 🐳 Docker Deployment

### Development with Docker Compose

#### docker-compose.yml

```yaml
version: '3.8'

services:
  user-service:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    ports:
      - "3000:3000"
      - "9229:9229" # Debug port
    environment:
      - NODE_ENV=development
    env_file:
      - .env.development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
    networks:
      - user-service-network
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: user_service_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - user-service-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - user-service-network
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - user-service-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - user-service-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  user-service-network:
    driver: bridge
```

#### Commands

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f user-service

# Run tests
docker-compose exec user-service npm test

# Access database
docker-compose exec postgres psql -U postgres -d user_service_dev

# Stop environment
docker-compose down

# Clean up (remove volumes)
docker-compose down -v
```

### Production Docker Setup

#### Multi-stage Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p /var/log/user-service && \
    chown -R nodejs:nodejs /var/log/user-service

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/scripts/health-check.js

# Start application
CMD ["node", "dist/server.js"]
```

#### Build and Run

```bash
# Build production image
docker build -t user-service:latest .

# Run production container
docker run -d \
  --name user-service \
  --env-file .env.production \
  -p 3000:3000 \
  --restart unless-stopped \
  user-service:latest

# Check logs
docker logs -f user-service

# Check health
docker exec user-service curl -f http://localhost:3000/health
```

## ☸️ Kubernetes Deployment

### Namespace Setup

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: user-service
  labels:
    name: user-service
    environment: production
```

### ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-service-config
  namespace: user-service
data:
  NODE_ENV: "production"
  PORT: "3000"
  HOST: "0.0.0.0"
  API_PREFIX: "/api/v1"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "user_service_prod"
  DB_SSL: "true"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  PROMETHEUS_ENABLED: "true"
  HEALTH_CHECK_ENABLED: "true"
```

### Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: user-service
  labels:
    app: user-service
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: user-service
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: user-service
        image: user-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: user-service-secrets
              key: DB_PASSWORD
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: user-service-secrets
              key: REDIS_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: user-service-secrets
              key: JWT_SECRET
        envFrom:
        - configMapRef:
            name: user-service-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: logs
          mountPath: /var/log/user-service
      volumes:
      - name: logs
        emptyDir: {}
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      - key: "node.kubernetes.io/unreachable"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
```

### Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: user-service
  labels:
    app: user-service
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  - port: 9090
    targetPort: 9090
    protocol: TCP
    name: metrics
  selector:
    app: user-service
```

### Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: user-service-ingress
  namespace: user-service
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.project5.com
    secretName: user-service-tls
  rules:
  - host: api.project5.com
    http:
      paths:
      - path: /user-service
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 80
```

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
  namespace: user-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Deployment Commands

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n user-service
kubectl get services -n user-service
kubectl get ingress -n user-service

# View logs
kubectl logs -f deployment/user-service -n user-service

# Scale deployment
kubectl scale deployment user-service --replicas=5 -n user-service

# Rolling update
kubectl set image deployment/user-service user-service=user-service:v1.1.0 -n user-service

# Check rollout status
kubectl rollout status deployment/user-service -n user-service

# Rollback deployment
kubectl rollout undo deployment/user-service -n user-service
```

### Helm Chart Deployment

#### Chart.yaml

```yaml
apiVersion: v2
name: user-service
description: A Helm chart for User Service
type: application
version: 0.1.0
appVersion: "1.0.0"
keywords:
  - user-service
  - authentication
  - microservice
home: https://github.com/project5/user-service
sources:
  - https://github.com/project5/user-service
maintainers:
  - name: Project5 Team
    email: team@project5.com
```

#### values.yaml

```yaml
replicaCount: 3

image:
  repository: user-service
  pullPolicy: Always
  tag: "latest"

serviceAccount:
  create: true
  annotations: {}
  name: ""

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: api.project5.com
      paths:
        - path: /user-service
          pathType: Prefix
  tls:
    - secretName: user-service-tls
      hosts:
        - api.project5.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

config:
  nodeEnv: production
  logLevel: info
  dbHost: postgres-service
  redisHost: redis-service

secrets:
  dbPassword: ""
  redisPassword: ""
  jwtSecret: ""

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
```

#### Helm Commands

```bash
# Install chart
helm install user-service ./helm/user-service \
  --namespace user-service \
  --create-namespace \
  --values values.production.yaml

# Upgrade chart
helm upgrade user-service ./helm/user-service \
  --namespace user-service \
  --values values.production.yaml

# Check status
helm status user-service -n user-service

# Uninstall chart
helm uninstall user-service -n user-service
```

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Secrets properly managed
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] Monitoring and logging setup
- [ ] Backup procedures in place
- [ ] Security scanning completed
- [ ] Load testing performed
- [ ] Rollback plan prepared

### Database Migration

```bash
# Run migrations
npm run migrate:up

# Seed initial data
npm run seed:prod

# Verify database
npm run db:verify
```

### SSL/TLS Configuration

#### Let's Encrypt with cert-manager

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@project5.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

### Load Balancer Configuration

#### NGINX Configuration

```nginx
upstream user_service {
    least_conn;
    server user-service-1:3000 max_fails=3 fail_timeout=30s;
    server user-service-2:3000 max_fails=3 fail_timeout=30s;
    server user-service-3:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.project5.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.project5.com;

    ssl_certificate /etc/ssl/certs/project5.crt;
    ssl_certificate_key /etc/ssl/private/project5.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location /user-service/ {
        proxy_pass http://user_service/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    location /health {
        access_log off;
        proxy_pass http://user_service/health;
    }
}
```

## 📊 Monitoring & Observability

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "user-service-rules.yml"

scrape_configs:
  - job_name: 'user-service'
    static_configs:
      - targets: ['user-service:9090']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "User Service Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"user-service\"}[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"user-service\"}[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"user-service\",status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### Alerting Rules

```yaml
# user-service-rules.yml
groups:
  - name: user-service
    rules:
      - alert: UserServiceDown
        expr: up{job="user-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "User Service is down"
          description: "User Service has been down for more than 1 minute"

      - alert: HighErrorRate
        expr: rate(http_requests_total{job="user-service",status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="user-service"}[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      - alert: DatabaseConnectionFailure
        expr: database_connections_failed_total{job="user-service"} > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failure"
          description: "Failed to connect to database"
```

## 🔒 Security Considerations

### Container Security

```dockerfile
# Security-hardened Dockerfile
FROM node:18-alpine AS base

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set security-focused environment
ENV NODE_ENV=production
ENV NPM_CONFIG_CACHE=/tmp/.npm
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /app

# Copy and install dependencies as root
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy application code
COPY --chown=nodejs:nodejs . .

# Remove unnecessary files
RUN rm -rf .git .gitignore README.md docs/ tests/ .env.example

# Switch to non-root user
USER nodejs

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

### Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: user-service-network-policy
  namespace: user-service
spec:
  podSelector:
    matchLabels:
      app: user-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 3000
    - protocol: TCP
      port: 9090
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          name: redis
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 443
```

### Pod Security Policy

```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: user-service-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check logs
kubectl logs -f deployment/user-service -n user-service

# Check environment variables
kubectl exec -it deployment/user-service -n user-service -- env

# Check secrets
kubectl get secrets -n user-service
kubectl describe secret user-service-secrets -n user-service

# Check configmap
kubectl get configmap user-service-config -n user-service -o yaml
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/user-service -n user-service -- \
  node -e "console.log('Testing DB connection...'); require('./dist/utils/db-test.js')"

# Check database service
kubectl get svc postgres-service -n database
kubectl describe svc postgres-service -n database

# Test DNS resolution
kubectl exec -it deployment/user-service -n user-service -- \
  nslookup postgres-service.database.svc.cluster.local
```

#### Performance Issues

```bash
# Check resource usage
kubectl top pods -n user-service
kubectl describe pod <pod-name> -n user-service

# Check HPA status
kubectl get hpa -n user-service
kubectl describe hpa user-service-hpa -n user-service

# Check metrics
curl http://user-service:9090/metrics
```

### Debug Commands

```bash
# Port forward for local debugging
kubectl port-forward deployment/user-service 3000:3000 -n user-service

# Execute shell in container
kubectl exec -it deployment/user-service -n user-service -- /bin/sh

# Copy files from container
kubectl cp user-service/<pod-name>:/var/log/user-service/app.log ./app.log -n user-service

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp -n user-service
```

## 🔄 Rollback Procedures

### Kubernetes Rollback

```bash
# Check rollout history
kubectl rollout history deployment/user-service -n user-service

# Rollback to previous version
kubectl rollout undo deployment/user-service -n user-service

# Rollback to specific revision
kubectl rollout undo deployment/user-service --to-revision=2 -n user-service

# Check rollback status
kubectl rollout status deployment/user-service -n user-service
```

### Helm Rollback

```bash
# Check release history
helm history user-service -n user-service

# Rollback to previous version
helm rollback user-service -n user-service

# Rollback to specific revision
helm rollback user-service 2 -n user-service
```

### Database Rollback

```bash
# Rollback migrations
npm run migrate:down

# Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME backup.sql

# Verify rollback
npm run db:verify
```

### Emergency Procedures

```bash
# Scale down to zero (emergency stop)
kubectl scale deployment user-service --replicas=0 -n user-service

# Enable maintenance mode
kubectl patch ingress user-service-ingress -n user-service -p '{
  "metadata": {
    "annotations": {
      "nginx.ingress.kubernetes.io/default-backend": "maintenance-service"
    }
  }
}'

# Restore service
kubectl scale deployment user-service --replicas=3 -n user-service
kubectl patch ingress user-service-ingress -n user-service --type=json -p='[
  {"op": "remove", "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1default-backend"}
]'
```

---

**For additional support, contact the DevOps team at [devops@project5.com](mailto:devops@project5.com) or visit our [Internal Wiki](https://wiki.project5.com/deployment).**