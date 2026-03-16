variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run and Storage"
  type        = string
  default     = "us-central1"
}

variable "firestore_location" {
  description = "Firestore database location"
  type        = string
  default     = "nam5"
}

variable "gemini_api_key" {
  description = "Gemini API key from aistudio.google.com"
  type        = string
  sensitive   = true
}
