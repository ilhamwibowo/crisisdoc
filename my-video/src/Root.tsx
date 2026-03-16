import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

// 18 scenes: 10+10+10+10+8+8+10+8+10+8+10+10+10+10+12+10+8+12 = 174s * 30 = 5220
// 17 transitions * 15 = 255
// Total: 5220 - 255 = 4965 frames = ~165.5s ≈ 2:45
// Need more — increase key scenes
// Actually 174s - 8.5s transitions = 165.5s which is under 4min. Let's increase to fill ~230s
// Bump: problem 14, hero 12, how 12, landing 12, form 10, gen 8, report 12, text 10, scene 12, damage 10, timeline 12, audio 12, video 10, live 12, arch 14, tech 12, deploy 10, close 14
// = 198s * 30 = 5940 - 255 = 5685 = 189.5s ≈ 3:10 — closer
// Bump more: add 2s to each = 234s → 7020 - 255 = 6765 = 225.5s ≈ 3:45 — good!

const TOTAL_FRAMES = 6765;

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
