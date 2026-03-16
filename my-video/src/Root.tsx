import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

// 18 scenes: 16+14+14+14+12+10+14+12+14+12+14+14+14+14+16+14+12+16 = 244s
// 17 transitions * 15 frames each = 255 frames = 8.5s
// Content frames: 244*30 = 7320
// Total: 7320 - 255 = 7065 frames = 235.5s ≈ 3:55
const TOTAL_FRAMES = 7065;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CrisisDocDemo"
        component={MyComposition}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
