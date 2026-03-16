from google import genai
from google.genai import types
from config import GEMINI_API_KEY, ANALYSIS_MODEL

client = genai.Client(api_key=GEMINI_API_KEY)


def analyze_photos(photos: list[tuple[bytes, str]], incident_type: str = "General") -> dict:
    """Pre-analyze uploaded photos for damage assessment.

    Returns structured analysis: detected objects, damage severity, etc.
    """
    if not photos:
        return {"summary": "No photos provided", "details": []}

    content_parts = []
    for photo_bytes, mime_type in photos:
        content_parts.append(types.Part.from_bytes(data=photo_bytes, mime_type=mime_type))

    content_parts.append(f"""Analyze these {len(photos)} photo(s) from a {incident_type} incident.

For each photo, provide:
1. What is visible in the image
2. Any visible damage and its apparent severity (Critical/High/Medium/Low)
3. Key objects, people, or equipment visible
4. Environmental conditions (lighting, weather, etc.)
5. Any safety hazards visible

Then provide an overall summary combining all photos.

Respond in this JSON format:
{{
    "overall_severity": "Critical|High|Medium|Low",
    "summary": "Brief overall assessment",
    "photos": [
        {{
            "photo_number": 1,
            "description": "What's in this photo",
            "damage_severity": "Critical|High|Medium|Low",
            "key_objects": ["list", "of", "objects"],
            "hazards": ["any", "visible", "hazards"]
        }}
    ]
}}""")

    response = client.models.generate_content(
        model=ANALYSIS_MODEL,
        contents=content_parts,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    import json
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return {"summary": response.text, "details": []}
