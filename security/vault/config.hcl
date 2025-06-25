# HashiCorp Vault Configuration for Project-5
# Enterprise secrets management

storage "consul" {
  address = "127.0.0.1:8500"
  path    = "vault/"
}

# HTTPS listener
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file  = "/vault/certs/vault.key"
}

# Enterprise license (if applicable)
# license_path = "/vault/license/vault.hclic"

# API address
api_addr = "https://vault.project5.local:8200"

# Cluster address
cluster_addr = "https://vault.project5.local:8201"

# UI configuration
ui = true

# Disable mlock for development (not recommended for production)
disable_mlock = true

# Log level
log_level = "INFO"

# Log format
log_format = "json"

# Default lease TTL
default_lease_ttl = "168h"

# Maximum lease TTL
max_lease_ttl = "720h"
