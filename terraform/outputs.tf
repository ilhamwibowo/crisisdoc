output "service_url" {
  description = "URL of the deployed CrisisDoc app"
  value       = google_cloud_run_v2_service.crisisdoc.uri
}

output "storage_bucket" {
  description = "GCS bucket for report assets"
  value       = google_storage_bucket.reports.name
}

output "service_account_email" {
  description = "Service account email for the Cloud Run service"
  value       = google_service_account.crisisdoc.email
}
