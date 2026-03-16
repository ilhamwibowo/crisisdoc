from google import genai
from google.genai import types
from config import GEMINI_API_KEY, IMAGE_MODEL

client = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_INSTRUCTION = """You are CrisisDoc, an AI incident report generator. Generate a comprehensive, professional incident report with interleaved text and diagrams.

Structure your report as follows:

1. **INCIDENT SUMMARY** — A brief overview with severity level (Critical/High/Medium/Low), incident type, date/time, and location.

2. **SCENE DIAGRAM** — Generate a top-down diagram showing the incident scene layout, positions of people/vehicles/equipment, and key reference points. Use clear labels and simple shapes.

3. **DETAILED NARRATIVE** — A chronological account of what happened, broken into:
   - Pre-incident conditions
   - The incident itself
   - Immediate aftermath

4. **DAMAGE ASSESSMENT DIAGRAM** — Generate a visual showing the damage areas, severity zones (color-coded), and measurements/estimates. If photos were provided, base this on what you see.

5. **EVIDENCE ANALYSIS** — If photos were provided, describe what each photo shows and its significance to the incident.

6. **CONTRIBUTING FACTORS** — Root cause analysis with contributing factors.

7. **TIMELINE DIAGRAM** — Generate a visual timeline showing the sequence of events.

8. **RECOMMENDED ACTIONS** — Immediate actions needed, preventive measures, and follow-up items.

9. **REPORT METADATA** — Report ID, generation timestamp, classification.

IMPORTANT:
- Generate actual diagrams/visualizations as images, not text-art
- Make diagrams clear, professional, and informative
- Use a formal but readable tone
- Be specific about damage, measurements, and conditions when photos are provided
- If details are missing, note them as "To be determined pending investigation"
"""


def generate_report(description: str, photos: list[tuple[bytes, str]], incident_type: str = "General",
                    location: str = "", incident_datetime: str = "") -> list[dict]:
    """Generate an interleaved text+image incident report.

    Args:
        description: Text description of what happened
        photos: List of (photo_bytes, mime_type) tuples
        incident_type: Category of incident
        location: Where the incident occurred
        incident_datetime: When the incident occurred

    Returns:
        List of dicts with 'type' ('text' or 'image') and 'content' (str or bytes)
    """
    content_parts = []

    # Add photos first
    for photo_bytes, mime_type in photos:
        content_parts.append(types.Part.from_bytes(data=photo_bytes, mime_type=mime_type))

    # Build the prompt
    prompt = f"""Generate a complete incident report for the following:

**Incident Type:** {incident_type}
**Location:** {location or 'Not specified'}
**Date/Time:** {incident_datetime or 'Not specified'}
**Number of Photos Provided:** {len(photos)}

**Description:**
{description}

Generate the full report with interleaved text sections and diagrams as specified in your instructions."""

    content_parts.append(prompt)

    response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=content_parts,
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            system_instruction=SYSTEM_INSTRUCTION,
        ),
    )

    # Parse interleaved response
    parts = []
    if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            if part.text:
                parts.append({"type": "text", "content": part.text})
            elif part.inline_data:
                parts.append({
                    "type": "image",
                    "content": part.inline_data.data,
                    "mime_type": part.inline_data.mime_type,
                })
    return parts


def generate_report_text_only(description: str, photos: list[tuple[bytes, str]], incident_type: str = "General",
                              location: str = "", incident_datetime: str = "") -> list[dict]:
    """Fallback: text-only report using gemini-2.0-flash."""
    from config import ANALYSIS_MODEL

    content_parts = []
    for photo_bytes, mime_type in photos:
        content_parts.append(types.Part.from_bytes(data=photo_bytes, mime_type=mime_type))

    prompt = f"""Generate a complete incident report for the following:

**Incident Type:** {incident_type}
**Location:** {location or 'Not specified'}
**Date/Time:** {incident_datetime or 'Not specified'}
**Number of Photos Provided:** {len(photos)}

**Description:**
{description}

Generate a comprehensive report in markdown format with all sections: Summary, Narrative, Damage Assessment, Evidence Analysis, Contributing Factors, Timeline, and Recommended Actions."""

    content_parts.append(prompt)

    response = client.models.generate_content(
        model=ANALYSIS_MODEL,
        contents=content_parts,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
        ),
    )

    return [{"type": "text", "content": response.text}]
