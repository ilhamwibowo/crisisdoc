import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

// 12 scenes: 5+5+4+3.5+3+4.5+4.5+4+4+5+5+5 = 52.5s * 30fps = 1575
// 11 transitions * 15 frames = 165
// Total: 1575 - 165 = 1410 frames
const TOTAL_FRAMES = 1410;

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
