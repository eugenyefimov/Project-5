#!/bin/bash
# Environment Configuration Script for Project-5 Frontend
# This script generates runtime environment configuration for the React application

set -e

# Default values
REACT_APP_API_URL=${REACT_APP_API_URL:-"http://localhost:8000"}
REACT_APP_ENVIRONMENT=${REACT_APP_ENVIRONMENT:-"development"}
REACT_APP_VERSION=${REACT_APP_VERSION:-"1.0.0"}
REACT_APP_MONITORING_ENABLED=${REACT_APP_MONITORING_ENABLED:-"true"}
REACT_APP_ANALYTICS_ENABLED=${REACT_APP_ANALYTICS_ENABLED:-"false"}
REACT_APP_DEBUG_MODE=${REACT_APP_DEBUG_MODE:-"false"}
REACT_APP_FEATURE_FLAGS=${REACT_APP_FEATURE_FLAGS:-"{}"}
REACT_APP_CDN_URL=${REACT_APP_CDN_URL:-""}
REACT_APP_WEBSOCKET_URL=${REACT_APP_WEBSOCKET_URL:-"ws://localhost:8000"}
REACT_APP_SENTRY_DSN=${REACT_APP_SENTRY_DSN:-""}
REACT_APP_GOOGLE_ANALYTICS_ID=${REACT_APP_GOOGLE_ANALYTICS_ID:-""}
REACT_APP_HOTJAR_ID=${REACT_APP_HOTJAR_ID:-""}
REACT_APP_INTERCOM_APP_ID=${REACT_APP_INTERCOM_APP_ID:-""}

# Cloud provider specific configurations
REACT_APP_AWS_REGION=${REACT_APP_AWS_REGION:-"us-east-1"}
REACT_APP_AZURE_REGION=${REACT_APP_AZURE_REGION:-"eastus"}
REACT_APP_GCP_REGION=${REACT_APP_GCP_REGION:-"us-central1"}

# Security configurations
REACT_APP_CSP_NONCE=${REACT_APP_CSP_NONCE:-""}
REACT_APP_TRUSTED_DOMAINS=${REACT_APP_TRUSTED_DOMAINS:-"localhost,127.0.0.1"}

# Performance configurations
REACT_APP_CACHE_DURATION=${REACT_APP_CACHE_DURATION:-"3600"}
REACT_APP_API_TIMEOUT=${REACT_APP_API_TIMEOUT:-"30000"}
REACT_APP_RETRY_ATTEMPTS=${REACT_APP_RETRY_ATTEMPTS:-"3"}

# Feature flags
REACT_APP_ENABLE_PWA=${REACT_APP_ENABLE_PWA:-"true"}
REACT_APP_ENABLE_OFFLINE=${REACT_APP_ENABLE_OFFLINE:-"true"}
REACT_APP_ENABLE_NOTIFICATIONS=${REACT_APP_ENABLE_NOTIFICATIONS:-"true"}
REACT_APP_ENABLE_DARK_MODE=${REACT_APP_ENABLE_DARK_MODE:-"true"}
REACT_APP_ENABLE_MULTI_LANGUAGE=${REACT_APP_ENABLE_MULTI_LANGUAGE:-"false"}

# Logging and monitoring
REACT_APP_LOG_LEVEL=${REACT_APP_LOG_LEVEL:-"info"}
REACT_APP_METRICS_ENDPOINT=${REACT_APP_METRICS_ENDPOINT:-"/metrics"}
REACT_APP_HEALTH_CHECK_ENDPOINT=${REACT_APP_HEALTH_CHECK_ENDPOINT:-"/health"}

echo "Generating runtime environment configuration..."

# Create the runtime configuration file
cat > /usr/share/nginx/html/env-config.js << EOF
// Runtime Environment Configuration for Project-5 Frontend
// Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

window._env_ = {
  // API Configuration
  REACT_APP_API_URL: "${REACT_APP_API_URL}",
  REACT_APP_WEBSOCKET_URL: "${REACT_APP_WEBSOCKET_URL}",
  REACT_APP_CDN_URL: "${REACT_APP_CDN_URL}",
  
  // Environment
  REACT_APP_ENVIRONMENT: "${REACT_APP_ENVIRONMENT}",
  REACT_APP_VERSION: "${REACT_APP_VERSION}",
  REACT_APP_DEBUG_MODE: ${REACT_APP_DEBUG_MODE},
  
  // Cloud Providers
  REACT_APP_AWS_REGION: "${REACT_APP_AWS_REGION}",
  REACT_APP_AZURE_REGION: "${REACT_APP_AZURE_REGION}",
  REACT_APP_GCP_REGION: "${REACT_APP_GCP_REGION}",
  
  // Monitoring & Analytics
  REACT_APP_MONITORING_ENABLED: ${REACT_APP_MONITORING_ENABLED},
  REACT_APP_ANALYTICS_ENABLED: ${REACT_APP_ANALYTICS_ENABLED},
  REACT_APP_SENTRY_DSN: "${REACT_APP_SENTRY_DSN}",
  REACT_APP_GOOGLE_ANALYTICS_ID: "${REACT_APP_GOOGLE_ANALYTICS_ID}",
  REACT_APP_HOTJAR_ID: "${REACT_APP_HOTJAR_ID}",
  REACT_APP_INTERCOM_APP_ID: "${REACT_APP_INTERCOM_APP_ID}",
  
  // Security
  REACT_APP_CSP_NONCE: "${REACT_APP_CSP_NONCE}",
  REACT_APP_TRUSTED_DOMAINS: "${REACT_APP_TRUSTED_DOMAINS}",
  
  // Performance
  REACT_APP_CACHE_DURATION: ${REACT_APP_CACHE_DURATION},
  REACT_APP_API_TIMEOUT: ${REACT_APP_API_TIMEOUT},
  REACT_APP_RETRY_ATTEMPTS: ${REACT_APP_RETRY_ATTEMPTS},
  
  // Feature Flags
  REACT_APP_ENABLE_PWA: ${REACT_APP_ENABLE_PWA},
  REACT_APP_ENABLE_OFFLINE: ${REACT_APP_ENABLE_OFFLINE},
  REACT_APP_ENABLE_NOTIFICATIONS: ${REACT_APP_ENABLE_NOTIFICATIONS},
  REACT_APP_ENABLE_DARK_MODE: ${REACT_APP_ENABLE_DARK_MODE},
  REACT_APP_ENABLE_MULTI_LANGUAGE: ${REACT_APP_ENABLE_MULTI_LANGUAGE},
  
  // Logging
  REACT_APP_LOG_LEVEL: "${REACT_APP_LOG_LEVEL}",
  REACT_APP_METRICS_ENDPOINT: "${REACT_APP_METRICS_ENDPOINT}",
  REACT_APP_HEALTH_CHECK_ENDPOINT: "${REACT_APP_HEALTH_CHECK_ENDPOINT}",
  
  // Feature Flags Object
  REACT_APP_FEATURE_FLAGS: ${REACT_APP_FEATURE_FLAGS}
};

// Freeze the configuration to prevent runtime modifications
Object.freeze(window._env_);

// Helper function to get environment variables
window.getEnv = function(key, defaultValue = null) {
  return window._env_[key] || defaultValue;
};

// Console log for debugging (only in development)
if (window._env_.REACT_APP_DEBUG_MODE) {
  console.log('Environment Configuration Loaded:', window._env_);
}
EOF

echo "Runtime environment configuration generated successfully!"
echo "Configuration file: /usr/share/nginx/html/env-config.js"
echo "Environment: ${REACT_APP_ENVIRONMENT}"
echo "API URL: ${REACT_APP_API_URL}"
echo "Debug Mode: ${REACT_APP_DEBUG_MODE}"

# Make the script executable
chmod +x /usr/share/nginx/html/env-config.js

echo "Environment configuration script completed."