# Variables for GCP Infrastructure Configuration

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}

variable "gke_node_count" {
  description = "Number of nodes in each GKE node pool"
  type        = number
  default     = 2
  
  validation {
    condition     = var.gke_node_count >= 1 && var.gke_node_count <= 10
    error_message = "GKE node count must be between 1 and 10."
  }
}

variable "gke_machine_type" {
  description = "Machine type for GKE nodes"
  type        = string
  default     = "e2-medium"
}

variable "gke_preemptible" {
  description = "Use preemptible instances for cost savings"
  type        = bool
  default     = true
}

variable "sql_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro"
}

variable "sql_user" {
  description = "Cloud SQL database user"
  type        = string
  default     = "project5_user"
}

variable "sql_password" {
  description = "Cloud SQL database password"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.sql_password) >= 8
    error_message = "SQL password must be at least 8 characters long."
  }
}

variable "domain_name" {
  description = "Domain name for SSL certificate"
  type        = string
  default     = "project5.example.com"
}

variable "tags" {
  description = "Additional labels to apply to resources"
  type        = map(string)
  default     = {
    project     = "project5"
    managed_by  = "terraform"
  }
}
