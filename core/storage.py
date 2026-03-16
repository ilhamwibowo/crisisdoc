from google.cloud import storage
from config import GCS_BUCKET
import uuid
from datetime import datetime


def get_bucket():
    client = storage.Client()
    return client.bucket(GCS_BUCKET)


def upload_photo(photo_bytes: bytes, mime_type: str, report_id: str) -> str:
    """Upload a photo to GCS and return its public URL."""
    ext = "jpg" if "jpeg" in mime_type else mime_type.split("/")[-1]
    blob_name = f"reports/{report_id}/photos/{uuid.uuid4().hex}.{ext}"

    bucket = get_bucket()
    blob = bucket.blob(blob_name)
    blob.upload_from_string(photo_bytes, content_type=mime_type)

    return f"gs://{GCS_BUCKET}/{blob_name}"


def upload_generated_image(image_bytes: bytes, mime_type: str, report_id: str) -> str:
    """Upload a generated diagram/image to GCS."""
    ext = "png" if "png" in mime_type else "jpg"
    blob_name = f"reports/{report_id}/generated/{uuid.uuid4().hex}.{ext}"

    bucket = get_bucket()
    blob = bucket.blob(blob_name)
    blob.upload_from_string(image_bytes, content_type=mime_type)

    return f"gs://{GCS_BUCKET}/{blob_name}"


def upload_report_assets(report_id: str, photos: list[tuple[bytes, str]],
                         generated_parts: list[dict]) -> dict:
    """Upload all assets for a report. Returns URLs dict."""
    photo_urls = []
    for photo_bytes, mime_type in photos:
        url = upload_photo(photo_bytes, mime_type, report_id)
        photo_urls.append(url)

    generated_urls = []
    for part in generated_parts:
        if part["type"] == "image":
            url = upload_generated_image(
                part["content"],
                part.get("mime_type", "image/png"),
                report_id,
            )
            generated_urls.append(url)

    return {
        "photo_urls": photo_urls,
        "generated_image_urls": generated_urls,
    }
