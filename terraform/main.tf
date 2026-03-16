terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "aiplatform.googleapis.com",
    "cloudbuild.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

# Cloud Storage bucket for report assets
resource "google_storage_bucket" "reports" {
  name          = "${var.project_id}-crisisdoc-reports"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 365
    }
  }
}

# Firestore database
resource "google_firestore_database" "default" {
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.apis]
}

# Service account for Cloud Run
resource "google_service_account" "crisisdoc" {
  account_id   = "crisisdoc-sa"
  display_name = "CrisisDoc Cloud Run Service Account"
}

# IAM: Storage access
resource "google_storage_bucket_iam_member" "crisisdoc_storage" {
  bucket = google_storage_bucket.reports.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.crisisdoc.email}"
}

# IAM: Firestore access
resource "google_project_iam_member" "crisisdoc_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.crisisdoc.email}"
}

# Cloud Run service
resource "google_cloud_run_v2_service" "crisisdoc" {
  name     = "crisisdoc"
  location = var.region

  template {
    service_account = google_service_account.crisisdoc.email

    containers {
      image = "gcr.io/${var.project_id}/crisisdoc:latest"

      ports {
        container_port = 8080
      }

      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }

      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.reports.name
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  depends_on = [google_project_service.apis]
}

# Allow unauthenticated access
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.crisisdoc.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
