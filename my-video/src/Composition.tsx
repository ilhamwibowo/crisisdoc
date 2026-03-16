import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

const BG = "#06060a";
const ACCENT_LIGHT = "#818cf8";
const TEXT = "#e4e4e7";
const MUTED = "#71717a";
const DANGER = "#ef4444";

// ===== TEXT SCENE (reusable) =====
const TextScene = ({ label, title, body, labelColor = ACCENT_LIGHT, titleColor = TEXT }: {
  label?: string; title: string; body?: string; labelColor?: string; titleColor?: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelOp = interpolate(frame, [0, 0.5 * fps], [0, 1], { extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [0.3 * fps, 1 * fps], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0.3 * fps, 1 * fps], [25, 0], { extrapolateRight: "clamp" });
  const bodyOp = interpolate(frame, [1.2 * fps, 2 * fps], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 900, padding: "0 48px" }}>
        {label && <p style={{ opacity: labelOp, color: labelColor, fontSize: 18, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>{label}</p>}
        <h1 style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, color: titleColor, fontSize: 52, fontWeight: 800, letterSpacing: -1, lineHeight: 1.25, marginBottom: 24 }}>{title}</h1>
        {body && <p style={{ opacity: bodyOp, color: MUTED, fontSize: 24, lineHeight: 1.6 }}>{body}</p>}
      </div>
    </AbsoluteFill>
  );
};

// ===== SCREENSHOT SCENE (reusable) =====
const ScreenScene = ({ src, label, caption }: { src: string; label: string; caption: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgScale = spring({ frame, fps, config: { damping: 20, mass: 0.6 } });
  const labelOp = interpolate(frame, [0.4 * fps, 0.9 * fps], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: 40 }}>
      <div style={{ opacity: labelOp, color: ACCENT_LIGHT, fontSize: 14, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>{label}</div>
      <div style={{ transform: `scale(${imgScale})`, borderRadius: 12, overflow: "hidden", border: "1px solid #23232a", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", maxWidth: 1050, maxHeight: 580 }}>
        <Img src={staticFile(src)} style={{ width: "100%", display: "block" }} />
      </div>
      <p style={{ opacity: labelOp, color: MUTED, fontSize: 18, marginTop: 16, textAlign: "center", maxWidth: 700 }}>{caption}</p>
    </AbsoluteFill>
  );
};

// ===== HERO SCENE =====
const HeroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badgeOp = interpolate(frame, [0, 0.5 * fps], [0, 1], { extrapolateRight: "clamp" });
  const titleScale = spring({ frame, fps, config: { damping: 15, mass: 0.8 } });
  const subOp = interpolate(frame, [1 * fps, 1.8 * fps], [0, 1], { extrapolateRight: "clamp" });
  const pillsOp = interpolate(frame, [2.5 * fps, 3.3 * fps], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ opacity: badgeOp, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 999, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: ACCENT_LIGHT, fontSize: 16, fontWeight: 500, marginBottom: 28 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT_LIGHT }} /> Powered by Gemini
        </div>
        <h1 style={{ transform: `scale(${titleScale})`, fontSize: 100, fontWeight: 800, letterSpacing: -4, background: "linear-gradient(135deg, #fff 0%, #c7d2fe 40%, #6366f1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 16 }}>CrisisDoc</h1>
        <p style={{ opacity: subOp, color: MUTED, fontSize: 24, maxWidth: 680, margin: "0 auto 36px", lineHeight: 1.5 }}>
          AI-powered multimedia incident storytelling<br />Text, diagrams, narration, and video — in one interleaved stream
        </p>
        <div style={{ opacity: pillsOp, display: "flex", gap: 14, justifyContent: "center" }}>
          {["📝 Text", "🎨 Images", "🎙️ Audio", "🎬 Video"].map((label, i) => (
            <div key={label} style={{
              padding: "12px 24px", borderRadius: 999, fontSize: 18, fontWeight: 600,
              background: ["rgba(99,102,241,0.15)", "rgba(34,197,94,0.12)", "rgba(245,158,11,0.12)", "rgba(239,68,68,0.12)"][i],
              color: [ACCENT_LIGHT, "#4ade80", "#fbbf24", "#f87171"][i],
              border: `1px solid ${["rgba(99,102,241,0.3)", "rgba(34,197,94,0.25)", "rgba(245,158,11,0.25)", "rgba(239,68,68,0.25)"][i]}`,
            }}>{label}</div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ===== MODALITY DETAIL =====
const ModalityDetail = ({ icon, title, desc, model, color }: {
  icon: string; title: string; desc: string; model: string; color: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, 0.8 * fps], [0, 1], { extrapolateRight: "clamp" });
  const scale = spring({ frame, fps, config: { damping: 15 } });
  const descOp = interpolate(frame, [1 * fps, 1.8 * fps], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity: op, transform: `scale(${scale})`, textAlign: "center", maxWidth: 700 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>{icon}</div>
        <h2 style={{ color, fontSize: 48, fontWeight: 800, marginBottom: 12 }}>{title}</h2>
        <p style={{ opacity: descOp, color: TEXT, fontSize: 24, lineHeight: 1.6, marginBottom: 20 }}>{desc}</p>
        <code style={{ opacity: descOp, color: MUTED, fontSize: 16, background: "#111", padding: "6px 14px", borderRadius: 8 }}>{model}</code>
      </div>
    </AbsoluteFill>
  );
};

// ===== ARCHITECTURE =====
const ArchScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOp = interpolate(frame, [0, 0.6 * fps], [0, 1], { extrapolateRight: "clamp" });
  const models = [
    { name: "gemini-2.5-flash-native-audio", role: "Live video + audio investigation", color: ACCENT_LIGHT },
    { name: "gemini-2.5-flash-image", role: "Interleaved text + image report", color: "#4ade80" },
    { name: "gemini-2.5-flash-preview-tts", role: "Documentary narration voiceover", color: "#fbbf24" },
    { name: "veo-3.1-fast-generate-preview", role: "Incident reconstruction video", color: "#f87171" },
  ];
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 900 }}>
        <p style={{ opacity: titleOp, color: ACCENT_LIGHT, fontSize: 16, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Architecture</p>
        <h2 style={{ opacity: titleOp, color: TEXT, fontSize: 44, fontWeight: 800, marginBottom: 40 }}>4 Gemini Models, 1 Story</h2>
        {models.map((m, i) => {
          const op = interpolate(frame, [(0.8 + i * 0.7) * fps, (1.3 + i * 0.7) * fps], [0, 1], { extrapolateRight: "clamp" });
          const x = interpolate(frame, [(0.8 + i * 0.7) * fps, (1.3 + i * 0.7) * fps], [40, 0], { extrapolateRight: "clamp" });
          return (
            <div key={m.name} style={{ opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 20, marginBottom: 18, background: "#0d0d12", border: "1px solid #23232a", borderRadius: 12, padding: "16px 24px" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
              <div style={{ textAlign: "left" }}>
                <p style={{ color: m.color, fontSize: 15, fontWeight: 600, fontFamily: "monospace", marginBottom: 2 }}>{m.name}</p>
                <p style={{ color: MUTED, fontSize: 19 }}>{m.role}</p>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ===== CLOSING =====
const ClosingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const tagOp = interpolate(frame, [1 * fps, 2 * fps], [0, 1], { extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [2.5 * fps, 3.5 * fps], [0, 1], { extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [3.5 * fps, 4.5 * fps], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ transform: `scale(${titleScale})`, fontSize: 90, fontWeight: 800, letterSpacing: -3, background: "linear-gradient(135deg, #fff 0%, #c7d2fe 40%, #6366f1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 28 }}>CrisisDoc</h1>
        <p style={{ opacity: tagOp, color: TEXT, fontSize: 32, fontWeight: 600, marginBottom: 20, lineHeight: 1.4 }}>
          One investigation. Four modalities.<br /><span style={{ color: ACCENT_LIGHT }}>One story.</span>
        </p>
        <p style={{ opacity: subOp, color: MUTED, fontSize: 18, marginBottom: 24 }}>
          Built with Gemini Live · GenAI SDK · Veo · Cloud Run · Terraform
        </p>
        <p style={{ opacity: urlOp, color: ACCENT_LIGHT, fontSize: 16, fontFamily: "monospace" }}>
          github.com/ilhamwibowo/crisisdoc
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ===== MAIN COMPOSITION — 4 MINUTES =====
const FPS = 30;
const T = 15;

export const MyComposition = () => {
  return (
    <TransitionSeries>
      {/* 1. Problem (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <TextScene label="The Problem" labelColor={DANGER}
          title="Incident reports take 3–4 hours to write"
          body="Workplace injuries cost businesses $170 billion per year in the US. Reports are often incomplete, inconsistent, and lack visual documentation. What if AI could turn a simple description into a complete multimedia documentary?" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 2. Hero (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <HeroScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 3. How it works (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <TextScene label="How It Works"
          title="Describe an incident → Get a multimedia documentary"
          body="Choose Live Investigation (point your camera, talk through the scene with Gemini Live responding in real-time) or Upload Mode (describe what happened, attach photos). CrisisDoc generates a complete narrated documentary with all four output modalities." />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 4. Landing page — deployed (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <ScreenScene src="demo/10-deployed-landing.png" label="Live on Google Cloud Run"
          caption="crisisdoc-257873184224.us-central1.run.app — Two modes: Live camera investigation or upload photos" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />

      {/* 5. Form filled (8s) */}
      <TransitionSeries.Sequence durationInFrames={8 * FPS}>
        <ScreenScene src="demo/02-form-filled.png" label="Step 1: Describe the Incident"
          caption="Select incident type, enter location, and describe what happened in detail" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 6. Generating (8s) */}
      <TransitionSeries.Sequence durationInFrames={8 * FPS}>
        <ScreenScene src="demo/03-generating.png" label="Step 2: AI Processing"
          caption="4 Gemini models working in parallel — generating diagrams, narration, and video reconstruction" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 7. Report title + listen (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <ScreenScene src="demo/05-report-title.png" label="The Output: Multimedia Documentary"
          caption="Storytelling narrative with 'Listen' buttons for TTS narration and 'Play Story' for full auto-narration" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: T })} />

      {/* 8. Modality 1: Text (8s) */}
      <TransitionSeries.Sequence durationInFrames={8 * FPS}>
        <ModalityDetail icon="📝" title="Text" desc="Engaging storytelling narrative — 'On a seemingly ordinary afternoon, the intersection became the scene of a critical vehicle collision...'" model="gemini-2.5-flash-image" color={ACCENT_LIGHT} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 9. Modality 2: Images — scene diagram (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <ScreenScene src="demo/06-scene-diagram.png" label="Modality: AI-Generated Images"
          caption="Scene reconstruction diagram with vehicle positions, witness locations, debris field, and impact zones" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 10. Images — damage (8s) */}
      <TransitionSeries.Sequence durationInFrames={8 * FPS}>
        <ScreenScene src="demo/04-report-top.png" label="AI-Generated Damage Assessment"
          caption="Color-coded damage visualization showing impact severity on both vehicles" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 11. Images — timeline (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <ScreenScene src="demo/08-timeline.png" label="AI-Generated Incident Timeline"
          caption="Visual sequence of events — from traffic light change through collision to 911 call" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 12. Modality 3: Audio (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <ModalityDetail icon="🎙️" title="Audio Narration" desc="Every section has a 'Listen' button. Click 'Play Story' to auto-narrate the entire documentary with section-by-section scrolling. Documentary-style TTS voiceover." model="gemini-2.5-flash-preview-tts" color="#fbbf24" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 13. Modality 4: Video (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <ScreenScene src="demo/06-scene-diagram.png" label="Modality: AI-Generated Video"
          caption="Veo generates a CCTV-style incident reconstruction video — embedded directly in the report with auto-play" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 14. Live mode explanation (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <TextScene label="Live Investigation Mode"
          title="Real-time conversation with Gemini Live"
          body="Point your camera at the scene. Talk through what happened. Gemini sees your video feed, hears your voice, and responds in real-time — asking follow-up questions, identifying hazards, and building the full picture before generating the documentary." />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 15. Architecture (12s) */}
      <TransitionSeries.Sequence durationInFrames={12 * FPS}>
        <ArchScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 16. Tech stack (10s) */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <TextScene label="Tech Stack"
          title="FastAPI + Google GenAI SDK + Cloud Run"
          body="WebSocket backend for live sessions, REST for upload mode. Vanilla JS frontend with WebRTC for camera/mic and AudioWorklet for PCM audio capture. TTS and video generation run in parallel via asyncio. Deployed with source-based Cloud Run deploy. Infrastructure managed with Terraform." />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 17. Deployment proof (8s) */}
      <TransitionSeries.Sequence durationInFrames={8 * FPS}>
        <ScreenScene src="demo/09-cloud-run-proof.png" label="Deployed on Google Cloud Run"
          caption="Health check endpoint confirming live deployment — crisisdoc-257873184224.us-central1.run.app/api/health" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 18. Closing (12s) */}
      <TransitionSeries.Sequence durationInFrames={12 * FPS}>
        <ClosingScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
