import React from 'react';
import { AbsoluteFill, Html5Audio, Sequence, Freeze, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { S, TOTAL } from './timeline';
import { C } from './theme';
import { clamp, easeInOut, useLayout } from './anim';
import { Grain, Vignette, BandWipe } from './components/graphics';
import { OpenRecipe, DemoRecipe, OutroRecipe } from './scenes/Examples';

/*
 * Edit-decision list. Each scene runs [from, to). Optional `reveal` makes the next
 * scene open over the previous one:
 *   circle — expands from a point (e.g. the element just tapped); x/y = [landscape, vertical]
 *   frame  — a rectangle iris from the center with a colored edge
 * Band wipes are listed separately (they cover the cut at `at`).
 */
type Reveal =
  | { kind: 'circle'; x: [number, number]; y: [number, number]; pre: number; post: number; edge?: string }
  | { kind: 'frame'; pre: number; post: number; color: string };

type SceneDef = { Comp: React.FC<{ dur: number }>; from: number; to: number; reveal?: Reveal };

const SCENES: SceneDef[] = [
  { Comp: OpenRecipe, from: S.open, to: S.demo },
  { Comp: DemoRecipe, from: S.demo, to: S.outro },
  { Comp: OutroRecipe, from: S.outro, to: TOTAL, reveal: { kind: 'circle', x: [960, 540], y: [540, 960], pre: 14, post: 4 } },
];

const WIPES: { at: number; color: string }[] = [
  // { at: S.someScene, color: C.primary },
];

// set to the chosen file, e.g. 'music/track.mp3' (public/music). null = silent draft.
const MUSIC: string | null = null;

const revealT = (g: number, from: number, r: Reveal) => interpolate(g, [from - r.pre, from + r.post], [0, 1], { ...clamp, easing: easeInOut });

const clipFor = (g: number, from: number, r: Reveal | undefined, V: boolean): string | undefined => {
  if (!r) return undefined;
  const t = revealT(g, from, r);
  if (t >= 1) return undefined;
  if (r.kind === 'circle') return `circle(${t * 2300}px at ${r.x[V ? 1 : 0]}px ${r.y[V ? 1 : 0]}px)`;
  const i = (1 - t) * 50;
  return `inset(${i}% ${i}% ${i}% ${i}%)`;
};

const SceneBlock: React.FC<SceneDef> = ({ Comp, from, to, reveal }) => {
  const g = useCurrentFrame();
  const { V } = useLayout();
  const clip = clipFor(g, from, reveal, V);
  const dur = to - from;
  return (
    <>
      {reveal && (
        // the incoming scene's first frame, frozen, while the reveal opens before the cut
        <Sequence from={from - reveal.pre} durationInFrames={reveal.pre} layout="none">
          <AbsoluteFill style={{ clipPath: clip }}>
            <Freeze frame={0}>
              <Comp dur={dur} />
            </Freeze>
          </AbsoluteFill>
        </Sequence>
      )}
      <Sequence from={from} durationInFrames={dur} layout="none">
        <AbsoluteFill style={{ clipPath: clip }}>
          <Comp dur={dur} />
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

const RevealEdge: React.FC<{ from: number; r: Reveal }> = ({ from, r }) => {
  const g = useCurrentFrame();
  const { V, W, H } = useLayout();
  const t = revealT(g, from, r);
  if (t <= 0 || t >= 1) return null;
  if (r.kind === 'frame') {
    const w = W * t;
    const h = H * t;
    return <div style={{ position: 'absolute', left: W / 2 - w / 2 - 10, top: H / 2 - h / 2 - 10, width: w + 20, height: h + 20, border: `18px solid ${r.color}`, boxSizing: 'border-box' }} />;
  }
  const rad = t * 2300;
  const cx = r.x[V ? 1 : 0];
  const cy = r.y[V ? 1 : 0];
  return (
    <div style={{ position: 'absolute', left: cx - rad - 12, top: cy - rad - 12, width: (rad + 12) * 2, height: (rad + 12) * 2, borderRadius: 9999, border: `14px solid ${r.edge ?? C.accent}`, boxSizing: 'border-box' }} />
  );
};

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    {MUSIC && <Html5Audio src={staticFile(MUSIC)} volume={(f) => interpolate(f, [0, 8, TOTAL - 110, TOTAL - 6], [0, 0.9, 0.9, 0], clamp)} />}
    {SCENES.map((s, i) => (
      <SceneBlock key={i} {...s} />
    ))}
    {SCENES.map((s, i) => (s.reveal ? <RevealEdge key={`e${i}`} from={s.from} r={s.reveal} /> : null))}
    {WIPES.map((w, i) => (
      <BandWipe key={i} at={w.at} color={w.color} />
    ))}
    <Vignette />
    <Grain />
  </AbsoluteFill>
);
