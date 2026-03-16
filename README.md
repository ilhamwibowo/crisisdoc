# CrisisDoc — AI Incident Documentary Generator

**Describe an incident → get a narrated multimedia documentary with AI-generated diagrams, voice narration, and video reconstruction. 4 Gemini models, 4 output modalities, one stream.**

**Live App:** https://crisisdoc-257873184224.us-central1.run.app

## Problem

Incident reports (workplace accidents, car crashes, property damage) take **3-4 hours** to write and are often incomplete. Workplace injuries alone cost businesses **$170B/year** in the US.

## Solution

CrisisDoc produces a complete **multimedia incident documentary** with all 4 output modalities:

- **Text** — Engaging storytelling narrative, not a dry report
- **Images** — AI-generated scene reconstruction diagrams, damage assessments, visual timelines
- **Audio** — Documentary-style TTS voiceover for every section with "Play Story" button
- **Video** — Veo-generated CCTV-style incident reconstruction

It also features **Live Investigation Mode** — point your camera at a scene, talk through what happened, and Gemini Live responds in real-time with voice.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | FastAPI + WebSocket |
| Frontend | Vanilla JS + WebRTC + AudioWorklet |
| Live Investigation | `gemini-2.5-flash-native-audio` (Gemini Live API) |
| Report Generation | `gemini-2.5-flash-image` (`response_modalities=['TEXT', 'IMAGE']`) |
| Voice Narration | `gemini-2.5-flash-preview-tts` |
| Video Reconstruction | `veo-3.1-fast-generate-preview` |
| SDK | Google GenAI SDK |
| Hosting | Google Cloud Run |
| IaC | Terraform |

## Reproducible Testing Instructions

### Prerequisites
- Python 3.12+
- Gemini API key from [AI Studio](https://aistudio.google.com/apikey) (Paid tier recommended)

### Quick Start (Local)

```bash
# Clone
git clone https://github.com/ilhamwibowo/crisisdoc.git
cd crisisdoc

# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set your Gemini API key
export GEMINI_API_KEY="your-api-key-here"

# Run the app
python main.py
```

Then open **http://localhost:8080** in Chrome.

### Test the Upload Mode (easiest)

1. Open the app in your browser
2. Click **"Upload Photos"** tab
3. Select an incident type (e.g., "Vehicle Collision")
4. Enter a location (e.g., "Intersection of 5th and Main")
5. Describe the incident in detail
6. Click **"Generate Report"**
7. Wait ~60-90 seconds for the full multimedia report

**Expected output:**
- Text narrative with storytelling sections
- AI-generated scene diagrams and damage visuals
- "Listen" buttons on each section (TTS narration)
- "Play Story" button to auto-narrate the entire report
- Embedded AI-generated video reconstruction

### Test the Live Investigation Mode

1. Click **"Live Investigation"** tab
2. Select incident type and location
3. Click **"Start Live Investigation"**
4. Grant camera + microphone permissions
5. Point your camera at anything and describe an "incident"
6. AI responds in real-time with voice + text
7. Click **"End & Report"** to generate the multimedia documentary

### Test via API

```bash
curl -X POST http://localhost:8080/api/upload-report \
  -F "incident_type=Vehicle Collision" \
  -F "location=5th and Main St" \
  -F "description=Two cars collided at the intersection. A blue sedan ran a red light and hit a white SUV."
```

### Deploy to Cloud Run

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

gcloud run deploy crisisdoc \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=your-key" \
  --memory=1Gi \
  --timeout=300
```

## Architecture

```
User (Browser)
    ↓ camera + mic OR description + photos
FastAPI App (Cloud Run)
    ↓
┌──────────────────────────────────────────┐
│  Phase 1: Live Investigation (optional)  │
│  Model: gemini-2.5-flash-native-audio    │
│  → Real-time video+audio analysis        │
├──────────────────────────────────────────┤
│  Phase 2: Report Generation              │
│  Model: gemini-2.5-flash-image           │
│  Config: response_modalities=            │
│          ['TEXT', 'IMAGE']               │
│  → Interleaved text + diagrams           │
├──────────────────────────────────────────┤
│  Phase 3: Narration + Video (parallel)   │
│  Model: gemini-2.5-flash-preview-tts     │
│  → Documentary voiceover per section     │
│  Model: veo-3.1-fast-generate-preview    │
│  → CCTV-style reconstruction video       │
└──────────────────────────────────────────┘
    ↓
Browser renders interleaved:
Text + Images + Audio + Video
```

## Hackathon

Built for the **Gemini Live Agent Challenge** — Creative Storyteller category.

- **4 Gemini models** producing **4 output modalities** in one interleaved stream
- Uses **Google GenAI SDK** for direct API access
- Deployed on **Google Cloud Run** with **Terraform** IaC
- Live investigation uses **Gemini Live API** for real-time bidirectional audio+video

## License

MIT
