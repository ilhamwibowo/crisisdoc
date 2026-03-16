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

// ===== SCENE: PROBLEM =====
const ProblemScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOp = interpolate(frame, [0, 0.8 * fps], [0, 1], { extrapolateRight: "clamp" });
  const statOp = interpolate(frame, [1.2 * fps, 2 * fps], [0, 1], { extrapolateRight: "clamp" });
  const statY = interpolate(frame, [1.2 * fps, 2 * fps], [30, 0], { extrapolateRight: "clamp" });
  const costOp = interpolate(frame, [2.5 * fps, 3.3 * fps], [0, 1], { extrapolateRight: "clamp" });
  const costY = interpolate(frame, [2.5 * fps, 3.3 * fps], [30, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 900, padding: "0 40px" }}>
        <p style={{ opacity: titleOp, color: DANGER, fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>The Problem</p>
        <h1 style={{ opacity: statOp, transform: `translateY(${statY}px)`, color: TEXT, fontSize: 58, fontWeight: 800, letterSpacing: -1, lineHeight: 1.2, marginBottom: 30 }}>
          Incident reports take <span style={{ color: DANGER }}>3–4 hours</span> to write
        </h1>
        <p style={{ opacity: costOp, transform: `translateY(${costY}px)`, color: MUTED, fontSize: 30, lineHeight: 1.5 }}>
          Workplace injuries alone cost businesses <span style={{ color: DANGER, fontWeight: 700 }}>$170 billion/year</span> in the US
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ===== SCENE: SOLUTION INTRO =====
const SolutionScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badgeOp = interpolate(frame, [0, 0.5 * fps], [0, 1], { extrapolateRight: "clamp" });
  const titleScale = spring({ frame, fps, config: { damping: 15, mass: 0.8 } });
  const subOp = interpolate(frame, [1 * fps, 1.8 * fps], [0, 1], { extrapolateRight: "clamp" });
  const pillsOp = interpolate(frame, [2.2 * fps, 3 * fps], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ opacity: badgeOp, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 999, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: ACCENT_LIGHT, fontSize: 16, fontWeight: 500, marginBottom: 24 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT_LIGHT }} />
          Powered by Gemini
        </div>
        <h1 style={{ transform: `scale(${titleScale})`, fontSize: 90, fontWeight: 800, letterSpacing: -3, background: "linear-gradient(135deg, #fff 0%, #c7d2fe 40%, #6366f1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 16 }}>CrisisDoc</h1>
        <p style={{ opacity: subOp, color: MUTED, fontSize: 24, maxWidth: 650, margin: "0 auto 32px", lineHeight: 1.5 }}>
          Describe an incident → Get a narrated multimedia documentary<br />with AI-generated diagrams, voiceover, and video reconstruction
        </p>
        <div style={{ opacity: pillsOp, display: "flex", gap: 12, justifyContent: "center" }}>
          {["📝 Text", "🎨 Images", "🎙️ Audio", "🎬 Video"].map((label, i) => (
            <div key={label} style={{
              padding: "10px 22px", borderRadius: 999, fontSize: 17, fontWeight: 600,
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

// ===== SCENE: APP SCREENSHOT =====
const AppScreenshot = ({ src, label, caption }: { src: string; label: string; caption: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgScale = spring({ frame, fps, config: { damping: 20, mass: 0.6 } });
  const labelOp = interpolate(frame, [0.5 * fps, 1 * fps], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: 40 }}>
      <div style={{ opacity: labelOp, color: ACCENT_LIGHT, fontSize: 15, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>{label}</div>
      <div style={{ transform: `scale(${imgScale})`, borderRadius: 12, overflow: "hidden", border: "1px solid #23232a", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", maxWidth: 1050, maxHeight: 620 }}>
        <Img src={staticFile(src)} style={{ width: "100%", display: "block" }} />
      </div>
      <p style={{ opacity: labelOp, color: MUTED, fontSize: 19, marginTop: 18, textAlign: "center", maxWidth: 700 }}>{caption}</p>
    </AbsoluteFill>
  );
};

// ===== SCENE: 4 MODALITIES =====
const ModalitiesScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOp = interpolate(frame, [0, 0.6 * fps], [0, 1], { extrapolateRight: "clamp" });

  const modalities = [
    { icon: "📝", label: "Text", desc: "Storytelling narrative — engaging, not dry", color: ACCENT_LIGHT },
    { icon: "🎨", label: "Images", desc: "AI-generated scene diagrams & damage visuals", color: "#4ade80" },
    { icon: "🎙️", label: "Audio", desc: "TTS documentary narration for every section", color: "#fbbf24" },
    { icon: "🎬", label: "Video", desc: "Veo-generated incident reconstruction", color: "#f87171" },
  ];

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 900 }}>
        <h2 style={{ opacity: titleOp, color: TEXT, fontSize: 44, fontWeight: 800, marginBottom: 16 }}>
          All <span style={{ color: ACCENT_LIGHT }}>4 Modalities</span> in One Stream
        </h2>
        <p style={{ opacity: titleOp, color: MUTED, fontSize: 20, marginBottom: 40 }}>
          Interleaved text, images, audio, and video output
        </p>
        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
          {modalities.map((m, i) => {
            const op = interpolate(frame, [(0.8 + i * 0.5) * fps, (1.2 + i * 0.5) * fps], [0, 1], { extrapolateRight: "clamp" });
            const y = interpolate(frame, [(0.8 + i * 0.5) * fps, (1.2 + i * 0.5) * fps], [30, 0], { extrapolateRight: "clamp" });
            return (
              <div key={m.label} style={{ opacity: op, transform: `translateY(${y}px)`, width: 200, background: "#0d0d12", border: "1px solid #23232a", borderRadius: 16, padding: "28px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{m.icon}</div>
                <h3 style={{ color: m.color, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{m.label}</h3>
                <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.5 }}>{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ===== SCENE: ARCHITECTURE =====
const ArchitectureScene = () => {
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
        <h2 style={{ opacity: titleOp, color: TEXT, fontSize: 42, fontWeight: 800, marginBottom: 40 }}>4 Gemini Models, 1 Story</h2>
        {models.map((m, i) => {
          const op = interpolate(frame, [(0.8 + i * 0.6) * fps, (1.2 + i * 0.6) * fps], [0, 1], { extrapolateRight: "clamp" });
          const x = interpolate(frame, [(0.8 + i * 0.6) * fps, (1.2 + i * 0.6) * fps], [40, 0], { extrapolateRight: "clamp" });
          return (
            <div key={m.name} style={{ opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 20, marginBottom: 18, background: "#0d0d12", border: "1px solid #23232a", borderRadius: 12, padding: "16px 24px" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
              <div style={{ textAlign: "left" }}>
                <p style={{ color: m.color, fontSize: 15, fontWeight: 600, fontFamily: "monospace", marginBottom: 2 }}>{m.name}</p>
                <p style={{ color: MUTED, fontSize: 18 }}>{m.role}</p>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ===== SCENE: CLOSING =====
const ClosingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const tagOp = interpolate(frame, [1 * fps, 1.8 * fps], [0, 1], { extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [2.2 * fps, 3 * fps], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ transform: `scale(${titleScale})`, fontSize: 80, fontWeight: 800, letterSpacing: -2, background: "linear-gradient(135deg, #fff 0%, #c7d2fe 40%, #6366f1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 24 }}>CrisisDoc</h1>
        <p style={{ opacity: tagOp, color: TEXT, fontSize: 30, fontWeight: 600, marginBottom: 16, lineHeight: 1.5 }}>
          One investigation. Four modalities. <span style={{ color: ACCENT_LIGHT }}>One story.</span>
        </p>
        <p style={{ opacity: subOp, color: MUTED, fontSize: 18 }}>
          Built with Gemini Live · GenAI SDK · Veo · Cloud Run
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ===== MAIN COMPOSITION =====
const FPS = 30;
const T = 15; // transition frames

export const MyComposition = () => {
  return (
    <TransitionSeries>
      {/* 1. Problem - 5s */}
      <TransitionSeries.Sequence durationInFrames={5 * FPS}>
        <ProblemScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 2. Solution - 5s */}
      <TransitionSeries.Sequence durationInFrames={5 * FPS}>
        <SolutionScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 3. Landing page - 4s */}
      <TransitionSeries.Sequence durationInFrames={4 * FPS}>
        <AppScreenshot src="demo/01-landing.png" label="The App" caption="Two modes: Live camera investigation or upload photos" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />

      {/* 4. Form filled - 3.5s */}
      <TransitionSeries.Sequence durationInFrames={3.5 * FPS}>
        <AppScreenshot src="demo/02-form-filled.png" label="Describe the Incident" caption="Select type, location, and describe what happened" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 5. Generating - 3s */}
      <TransitionSeries.Sequence durationInFrames={3 * FPS}>
        <AppScreenshot src="demo/03-generating.png" label="AI Processing" caption="Generating diagrams, narration, and video reconstruction..." />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 6. Report title + Listen button - 4.5s */}
      <TransitionSeries.Sequence durationInFrames={4.5 * FPS}>
        <AppScreenshot src="demo/05-report-title.png" label="The Documentary" caption="Listen buttons on each section — Play Story narrates the entire report" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: T })} />

      {/* 7. Video reconstruction - 4.5s */}
      <TransitionSeries.Sequence durationInFrames={4.5 * FPS}>
        <AppScreenshot src="demo/06-scene-diagram.png" label="AI-Generated Video" caption="Veo generates a CCTV-style incident reconstruction video" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 8. Damage report - 4s */}
      <TransitionSeries.Sequence durationInFrames={4 * FPS}>
        <AppScreenshot src="demo/04-report-top.png" label="AI-Generated Diagrams" caption="Scene reconstruction, damage assessment, and evidence analysis" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 9. Timeline - 4s */}
      <TransitionSeries.Sequence durationInFrames={4 * FPS}>
        <AppScreenshot src="demo/08-timeline.png" label="Visual Timeline" caption="AI-generated timeline with timestamps and event sequence" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 10. 4 Modalities - 5s */}
      <TransitionSeries.Sequence durationInFrames={5 * FPS}>
        <ModalitiesScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 11. Architecture - 5s */}
      <TransitionSeries.Sequence durationInFrames={5 * FPS}>
        <ArchitectureScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

      {/* 12. Closing - 5s */}
      <TransitionSeries.Sequence durationInFrames={5 * FPS}>
        <ClosingScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
