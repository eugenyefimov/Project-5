# Outputs for GCP Infrastructure

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

output "zone" {
  description = "GCP Zone"
  value       = var.zone
}

output "vpc_network_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.main.name
}

output "vpc_network_self_link" {
  description = "Self link of the VPC network"
  value       = google_compute_network.main.self_link
}

output "gke_cluster_name" {
  description = "Name of the GKE cluster"
  value       = google_container_cluster.main.name
}

output "gke_cluster_endpoint" {
  description = "Endpoint of the GKE cluster"
  value       = google_container_cluster.main.endpoint
  sensitive   = true
}

output "gke_cluster_ca_certificate" {
  description = "CA certificate of the GKE cluster"
  value       = google_container_cluster.main.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "gke_service_account_email" {
  description = "Email of the GKE service account"
  value       = google_service_account.gke.email
}

output "sql_instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.main.name
}

output "sql_instance_connection_name" {
  description = "Connection name of the Cloud SQL instance"
  value       = google_sql_database_instance.main.connection_name
}

output "sql_instance_private_ip" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.main.private_ip_address
}

output "sql_database_name" {
  description = "Name of the Cloud SQL database"
  value       = google_sql_database.main.name
}

output "storage_bucket_name" {
  description = "Name of the Cloud Storage bucket"
  value       = google_storage_bucket.main.name
}

output "storage_bucket_url" {
  description = "URL of the Cloud Storage bucket"
  value       = google_storage_bucket.main.url
}

output "cdn_backend_bucket_name" {
  description = "Name of the CDN backend bucket"
  value       = google_compute_backend_bucket.main.name
}

output "load_balancer_ip" {
  description = "IP address of the load balancer"
  value       = google_compute_global_address.main.address
}

output "ssl_certificate_name" {
  description = "Name of the SSL certificate"
  value       = google_compute_managed_ssl_certificate.main.name
}

output "secret_manager_db_password_id" {
  description = "ID of the database password secret"
  value       = google_secret_manager_secret.db_password.secret_id
}

output "firewall_rules" {
  description = "Names of created firewall rules"
  value = [
    google_compute_firewall.internal.name,
    google_compute_firewall.https.name,
    google_compute_firewall.http.name
  ]
}

output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.main.name} --region ${var.region} --project ${var.project_id}"
}

output "application_urls" {
  description = "Application access URLs"
  value = {
    load_balancer = "https://${google_compute_global_address.main.address}"
    domain        = "https://${var.domain_name}"
  }
}
