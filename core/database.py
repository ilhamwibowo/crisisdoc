from google.cloud import firestore
from config import FIRESTORE_COLLECTION
from datetime import datetime, timezone
import uuid


def get_db():
    return firestore.Client()


def save_report(report_data: dict) -> str:
    """Save a report to Firestore. Returns report ID."""
    db = get_db()
    report_id = report_data.get("id", uuid.uuid4().hex[:12])

    doc_ref = db.collection(FIRESTORE_COLLECTION).document(report_id)
    doc_ref.set({
        **report_data,
        "id": report_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })

    return report_id


def get_report(report_id: str) -> dict | None:
    """Fetch a single report by ID."""
    db = get_db()
    doc = db.collection(FIRESTORE_COLLECTION).document(report_id).get()
    return doc.to_dict() if doc.exists else None


def list_reports(limit: int = 20) -> list[dict]:
    """List recent reports, newest first."""
    db = get_db()
    docs = (
        db.collection(FIRESTORE_COLLECTION)
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )
    return [doc.to_dict() for doc in docs]


def delete_report(report_id: str) -> bool:
    """Delete a report by ID."""
    db = get_db()
    doc_ref = db.collection(FIRESTORE_COLLECTION).document(report_id)
    if doc_ref.get().exists:
        doc_ref.delete()
        return True
    return False
