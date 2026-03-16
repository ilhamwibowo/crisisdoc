import os

# Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
LIVE_MODEL = "gemini-2.5-flash-native-audio-latest"
IMAGE_MODEL = "gemini-2.5-flash-image"
TTS_MODEL = "gemini-2.5-flash-preview-tts"
VIDEO_MODEL = "veo-3.1-fast-generate-preview"
ANALYSIS_MODEL = "gemini-2.0-flash"

# GCP
GCP_PROJECT = os.environ.get("GCP_PROJECT", "")
GCS_BUCKET = os.environ.get("GCS_BUCKET", "crisisdoc-reports")
FIRESTORE_COLLECTION = "reports"

# App
APP_TITLE = "CrisisDoc"
MAX_PHOTOS = 5
MAX_KEY_FRAMES = 8
FRAME_CAPTURE_INTERVAL = 2  # seconds between stored key frames
AUDIO_SAMPLE_RATE_INPUT = 16000
AUDIO_SAMPLE_RATE_OUTPUT = 24000
