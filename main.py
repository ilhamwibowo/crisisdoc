import asyncio
import base64
import json
import uuid
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional

from google import genai
from google.genai import types

import httpx

from config import (
    GEMINI_API_KEY,
    LIVE_MODEL,
    IMAGE_MODEL,
    TTS_MODEL,
    VIDEO_MODEL,
    AUDIO_SAMPLE_RATE_INPUT,
    MAX_KEY_FRAMES,
)

app = FastAPI(title="CrisisDoc")
app.mount("/static", StaticFiles(directory="static"), name="static")

LIVE_SYSTEM_INSTRUCTION = """You are CrisisDoc, an AI incident investigator conducting a live field investigation.

You are receiving a live video feed and audio from an investigator at an incident scene (workplace accident, vehicle collision, property damage, etc.).

Your role:
- Actively analyze what you see in the video feed
- Ask clarifying questions about damage, conditions, and circumstances
- Point out details the investigator might miss ("Can you show me the left side?" / "I notice scorch marks on the ceiling")
- Assess severity and safety hazards in real-time
- Build a mental model of the incident for the report you'll generate afterward

Be conversational, professional, and thorough. Speak naturally as if you're a senior investigator guiding a junior one through the scene. Keep responses concise (1-3 sentences) so the conversation flows naturally.

When you see damage, describe what you observe. When you hear the description, ask follow-up questions. Build the full picture."""


@app.get("/")
async def index():
    return FileResponse("static/index.html")


@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    await ws.accept()

    # Wait for config message
    try:
        config_msg = await ws.receive_json()
    except Exception:
        await ws.close()
        return

    incident_type = config_msg.get("incident_type", "General")
    location = config_msg.get("location", "")

    # Session state
    frames: list[bytes] = []
    transcript_parts: list[str] = []

    client = genai.Client(api_key=GEMINI_API_KEY)

    live_config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=types.Content(
            parts=[types.Part.from_text(
                text=f"{LIVE_SYSTEM_INSTRUCTION}\n\nIncident type: {incident_type}\nLocation: {location}"
            )]
        ),
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
            )
        ),
    )

    try:
        async with client.aio.live.connect(model=LIVE_MODEL, config=live_config) as session:
            end_event = asyncio.Event()

            async def handle_client():
                """Read from browser, forward to Gemini."""
                try:
                    while not end_event.is_set():
                        raw = await ws.receive_text()
                        msg = json.loads(raw)

                        if msg["type"] == "audio":
                            data = base64.b64decode(msg["data"])
                            await session.send_realtime_input(
                                media=types.Blob(data=data, mime_type=f"audio/pcm;rate={AUDIO_SAMPLE_RATE_INPUT}")
                            )

                        elif msg["type"] == "video":
                            data = base64.b64decode(msg["data"])
                            # Store key frames for report (cap at MAX_KEY_FRAMES)
                            if len(frames) < MAX_KEY_FRAMES:
                                frames.append(data)
                            await session.send_realtime_input(
                                media=types.Blob(data=data, mime_type="image/jpeg")
                            )

                        elif msg["type"] == "text":
                            transcript_parts.append(f"Investigator: {msg['data']}")
                            await session.send_client_content(
                                turns=types.Content(
                                    role="user",
                                    parts=[types.Part.from_text(text=msg["data"])]
                                )
                            )

                        elif msg["type"] == "end":
                            end_event.set()
                            return

                except WebSocketDisconnect:
                    end_event.set()
                except Exception:
                    end_event.set()

            async def handle_gemini():
                """Read from Gemini, forward to browser."""
                try:
                    while not end_event.is_set():
                        async for response in session.receive():
                            if end_event.is_set():
                                return

                            server_content = response.server_content
                            if server_content is None:
                                continue

                            model_turn = server_content.model_turn
                            if model_turn:
                                for part in model_turn.parts:
                                    if part.text:
                                        transcript_parts.append(f"CrisisDoc: {part.text}")
                                        await ws.send_json({
                                            "type": "text",
                                            "data": part.text,
                                        })
                                    if part.inline_data:
                                        await ws.send_json({
                                            "type": "audio",
                                            "data": base64.b64encode(part.inline_data.data).decode(),
                                            "mime_type": part.inline_data.mime_type or "audio/pcm",
                                        })

                            if server_content.turn_complete:
                                await ws.send_json({"type": "turn_complete"})

                except WebSocketDisconnect:
                    end_event.set()
                except Exception:
                    end_event.set()

            # Run both concurrently
            await asyncio.gather(
                handle_client(),
                handle_gemini(),
                return_exceptions=True,
            )

    except Exception as e:
        await ws.send_json({"type": "error", "data": f"Live session failed: {e}"})

    # --- Phase 2: Generate interleaved report ---
    await ws.send_json({"type": "status", "data": "Generating multimedia report with diagrams..."})

    try:
        report_parts = await generate_report_from_session(
            frames=frames,
            transcript="\n".join(transcript_parts),
            incident_type=incident_type,
            location=location,
        )

        for part in report_parts:
            if part["type"] == "text":
                await ws.send_json({"type": "report_text", "data": part["content"]})
            elif part["type"] == "image":
                await ws.send_json({
                    "type": "report_image",
                    "data": base64.b64encode(part["content"]).decode(),
                })

        # Phase 3: Generate narration + reconstruction video in parallel
        await ws.send_json({"type": "status", "data": "Generating narration & video reconstruction..."})
        text_sections = [p["content"] for p in report_parts if p["type"] == "text"]

        narration_task = generate_narration(text_sections)
        video_task = generate_reconstruction_video(incident_type, "\n".join(transcript_parts))
        audio_sections, video_data = await asyncio.gather(narration_task, video_task)

        for i, audio in enumerate(audio_sections):
            if audio:
                await ws.send_json({
                    "type": "report_audio",
                    "data": base64.b64encode(audio).decode(),
                    "section": i,
                })

        if video_data:
            await ws.send_json({
                "type": "report_video",
                "data": base64.b64encode(video_data).decode(),
            })

        await ws.send_json({"type": "report_done"})

    except Exception as e:
        await ws.send_json({"type": "error", "data": f"Report generation failed: {e}"})
        # Fallback: text-only
        try:
            report_parts = await generate_report_text_fallback(
                frames=frames,
                transcript="\n".join(transcript_parts),
                incident_type=incident_type,
                location=location,
            )
            for part in report_parts:
                await ws.send_json({"type": "report_text", "data": part["content"]})
            await ws.send_json({"type": "report_done"})
        except Exception:
            pass

    await ws.close()


REPORT_SYSTEM_INSTRUCTION = """You are CrisisDoc, a creative director producing a multimedia incident documentary.

You conducted a live video investigation and now you're crafting the story of what happened — a compelling, visual narrative that weaves together text and diagrams into one cohesive multimedia experience. Think of this as a documentary, not a dry report.

Write in a narrative storytelling style — engaging, vivid, and human. Each section should flow naturally into the next, telling the story of the incident.

Structure your documentary with these sections, generating DIAGRAMS as images where indicated:

1. **THE INCIDENT** — Open with the severity (Critical/High/Medium/Low), setting, and a compelling one-paragraph overview that sets the scene.

2. **SCENE RECONSTRUCTION** — [GENERATE IMAGE] A top-down diagram reconstructing the scene — positions of people/vehicles/equipment, movement paths, impact points. Make it detailed and clear.

3. **WHAT HAPPENED** — The story told chronologically. Set the scene before the incident, describe the critical moments, and the immediate aftermath. Use vivid, specific language.

4. **THE DAMAGE** — [GENERATE IMAGE] A damage assessment visual with color-coded severity zones, annotations, and measurements.

5. **WHAT THE EVIDENCE SHOWS** — Key observations from the investigation footage, what the physical evidence tells us.

6. **WHY IT HAPPENED** — Root cause analysis told as a narrative — the chain of events and contributing factors.

7. **THE TIMELINE** — [GENERATE IMAGE] A visual timeline showing the sequence of events with timestamps.

8. **WHAT HAPPENS NEXT** — Immediate actions, preventive measures, and follow-up steps.

Generate actual diagrams as images — professional, clear, and informative. The text should be written to be read aloud as narration — engaging and authoritative, like a documentary narrator."""


async def generate_report_from_session(
    frames: list[bytes],
    transcript: str,
    incident_type: str,
    location: str,
) -> list[dict]:
    """Generate interleaved text+image report from live session data."""
    client = genai.Client(api_key=GEMINI_API_KEY)

    content_parts = []

    # Add key frames
    step = max(1, len(frames) // MAX_KEY_FRAMES)
    selected = frames[::step][:MAX_KEY_FRAMES]
    for frame in selected:
        content_parts.append(types.Part.from_bytes(data=frame, mime_type="image/jpeg"))

    content_parts.append(types.Part.from_text(
        text=f"""Generate a complete incident report based on this live investigation.

**Incident Type:** {incident_type}
**Location:** {location or 'Not specified'}
**Key Frames from Investigation:** {len(selected)}

**Investigation Transcript:**
{transcript}

Generate the full report with interleaved text and diagrams as specified."""
    ))

    response = await client.aio.models.generate_content(
        model=IMAGE_MODEL,
        contents=content_parts,
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            system_instruction=REPORT_SYSTEM_INSTRUCTION,
        ),
    )

    parts = []
    if response.candidates and response.candidates[0].content:
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


async def generate_report_text_fallback(
    frames: list[bytes],
    transcript: str,
    incident_type: str,
    location: str,
) -> list[dict]:
    """Fallback: text-only report."""
    from config import ANALYSIS_MODEL
    client = genai.Client(api_key=GEMINI_API_KEY)

    content_parts = []
    step = max(1, len(frames) // MAX_KEY_FRAMES)
    for frame in frames[::step][:MAX_KEY_FRAMES]:
        content_parts.append(types.Part.from_bytes(data=frame, mime_type="image/jpeg"))

    content_parts.append(types.Part.from_text(
        text=f"""Generate a complete incident report in markdown.

**Incident Type:** {incident_type}
**Location:** {location or 'Not specified'}

**Investigation Transcript:**
{transcript}

Include all sections: Summary, Narrative, Damage Assessment, Evidence, Contributing Factors, Timeline, Actions."""
    ))

    response = await client.aio.models.generate_content(
        model=ANALYSIS_MODEL,
        contents=content_parts,
    )

    return [{"type": "text", "content": response.text}]


async def generate_narration(text_sections: list[str]) -> list[bytes | None]:
    """Generate TTS audio narration for text sections in parallel."""
    client = genai.Client(api_key=GEMINI_API_KEY)

    async def narrate_one(text: str) -> bytes | None:
        try:
            response = await client.aio.models.generate_content(
                model=TTS_MODEL,
                contents=f"Narrate this incident documentary section in a professional, authoritative documentary tone. Be engaging and clear:\n\n{text}",
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
                        )
                    ),
                ),
            )
            return response.candidates[0].content.parts[0].inline_data.data
        except Exception:
            return None

    results = await asyncio.gather(*[narrate_one(t) for t in text_sections])
    return list(results)


async def generate_reconstruction_video(
    incident_type: str,
    description: str,
) -> bytes | None:
    """Generate a short incident reconstruction video using Veo."""
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = (
            f"Security camera surveillance footage of a {incident_type.lower()}. "
            f"{description[:300]} "
            "Realistic CCTV camera angle, slightly grainy, timestamp overlay in corner. "
            "4 second clip showing the key moment of the incident."
        )

        # Veo returns an operation that needs polling
        import time
        op = client.models.generate_videos(
            model=VIDEO_MODEL,
            prompt=prompt,
            config=types.GenerateVideosConfig(
                number_of_videos=1,
                duration_seconds=4,
            ),
        )

        # Poll (sync, but fast model usually <30s)
        for _ in range(24):  # max 2 min
            await asyncio.sleep(5)
            op = client.operations.get(operation=op)
            if op.done:
                break

        if not op.done or not op.result or not op.result.generated_videos:
            return None

        video_uri = op.result.generated_videos[0].video.uri
        # Download the video
        async with httpx.AsyncClient(follow_redirects=True) as http:
            resp = await http.get(
                video_uri,
                headers={"x-goog-api-key": GEMINI_API_KEY},
            )
            if resp.status_code == 200:
                return resp.content
        return None
    except Exception:
        return None


@app.get("/api/health")
async def health():
    return {"status": "ok", "model_live": LIVE_MODEL, "model_image": IMAGE_MODEL}


@app.post("/api/upload-report")
async def upload_report(
    incident_type: str = Form("General"),
    location: str = Form(""),
    description: str = Form(""),
    photos: list[UploadFile] = File(default=[]),
):
    """Generate a report from uploaded photos + description (non-live fallback)."""
    try:
        frames = []
        for photo in photos[:MAX_KEY_FRAMES]:
            data = await photo.read()
            frames.append(data)

        report_parts = await generate_report_from_session(
            frames=frames,
            transcript=f"Investigator's description: {description}",
            incident_type=incident_type,
            location=location,
        )

        serialized = []
        for part in report_parts:
            if part["type"] == "text":
                serialized.append({"type": "text", "content": part["content"]})
            elif part["type"] == "image":
                serialized.append({
                    "type": "image",
                    "content": base64.b64encode(part["content"]).decode(),
                })

        # Generate narration + video in parallel
        text_sections = [p["content"] for p in report_parts if p["type"] == "text"]
        narration_task = generate_narration(text_sections)
        video_task = generate_reconstruction_video(incident_type, description)
        audio_sections, video_data = await asyncio.gather(narration_task, video_task)

        audio_serialized = []
        for audio in audio_sections:
            if audio:
                audio_serialized.append(base64.b64encode(audio).decode())
            else:
                audio_serialized.append(None)

        video_b64 = base64.b64encode(video_data).decode() if video_data else None

        return JSONResponse({"parts": serialized, "narration": audio_serialized, "video": video_b64})

    except Exception as e:
        # Fallback to text-only
        try:
            report_parts = await generate_report_text_fallback(
                frames=frames,
                transcript=f"Investigator's description: {description}",
                incident_type=incident_type,
                location=location,
            )
            serialized = [{"type": "text", "content": p["content"]} for p in report_parts]
            return JSONResponse({"parts": serialized})
        except Exception as e2:
            return JSONResponse({"error": str(e2)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
