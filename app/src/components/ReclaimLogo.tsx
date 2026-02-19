/**
 * ReclaimLogo - Animated Skia logo for loading screen.
 *
 * Matches splash.png:
 *   - 3 elliptical rings: vertical, left-diagonal (−45°), right-diagonal (+45°)
 *   - 3 orbiting white orbs: top-centre, bottom-left, bottom-right
 *   - Bold "R" centred inside the rings:
 *       • dark navy body fill (covers ring segments behind it)
 *       • bowl counter "punched out" with background colour so hole shows rings
 *       • bright neon-blue stroke + glow outline on both body and counter
 *
 * Centering is done inside makeROuterPath / makeRCounterPath by mapping the
 * 44×60 reference bounding-box centre (22, 30) directly to the canvas centre,
 * so there is NO Group transform for the R and therefore NO transform-order bugs.
 */

import React, { useEffect, useMemo } from 'react';
import {
  Canvas,
  Group,
  Circle,
  Path,
  BlurMask,
  Skia,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';

// ─── canvas constants ────────────────────────────────────────────────────────
const SIZE = 224;
const CENTER = SIZE / 2; // 112

// ─── colours ────────────────────────────────────────────────────────────────
const RING_COLOR = '#60a5fa';
/** Dark navy: slightly lighter than background so the R body reads as a form */
const R_BODY = '#0e2246';
/** Must match the loading-screen background so the counter looks transparent */
const BG_COLOR = '#0b1220';
/** Bright neon-blue outline for the R and counter inner edge */
const R_GLOW = '#93c5fd';
const ORB_WHITE = '#ffffff';
const ORB_GLOW = 'rgba(147, 197, 253, 0.9)';

// ─── rings (3 rings: vertical + two diagonals, matching splash.png) ──────────
const RINGS = [
  { rx: 56, ry: 28, rot: 90 },  // vertical ellipse  (tall)
  { rx: 56, ry: 28, rot: -45 }, // left diagonal
  { rx: 56, ry: 28, rot: 45 },  // right diagonal
] as const;

// ─── orbs (one per ring, at the ring's "outer" extremity) ────────────────────
const ORBS = [
  { ring: 0, angle: Math.PI * 1.5 },  // top  (vertical ring)
  { ring: 1, angle: Math.PI * 0.7 },  // bottom-left  (left-diagonal ring)
  { ring: 2, angle: Math.PI * 0.3 },  // bottom-right (right-diagonal ring)
] as const;

// ─── ellipse helpers ─────────────────────────────────────────────────────────
function getPointOnEllipse(
  rx: number,
  ry: number,
  rotDeg: number,
  angle: number,
  center: number,
): { x: number; y: number } {
  'worklet';
  const lx = rx * Math.cos(angle);
  const ly = ry * Math.sin(angle);
  const rad = (rotDeg * Math.PI) / 180;
  return {
    x: center + lx * Math.cos(rad) - ly * Math.sin(rad),
    y: center + lx * Math.sin(rad) + ly * Math.cos(rad),
  };
}

function makeEllipsePath(
  rx: number,
  ry: number,
  rotDeg: number,
  center: number,
) {
  const p = Skia.Path.Make();
  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const lx = rx * Math.cos(t);
    const ly = ry * Math.sin(t);
    const px = center + lx * cos - ly * sin;
    const py = center + lx * sin + ly * cos;
    if (i === 0) p.moveTo(px, py);
    else p.lineTo(px, py);
  }
  p.close();
  return p;
}

// ─── R path builders ─────────────────────────────────────────────────────────
/**
 * Reference bounding-box for the R: 44 wide × 60 tall, centre at (22, 30).
 *
 * The helpers sx/sy map those reference coords to canvas coords so that the
 * bounding-box centre (22, 30) maps exactly to (cx, cy) = canvas centre.
 *
 * Outer silhouette (clockwise, no counter — filled solid):
 *
 *   TL ─────────── bowl-top
 *    │              ╮  (cubic arc: D-shape bowl)
 *    │              ╯  bowl-bottom
 *    │   ╲          ╲  leg outer
 *    │    ╲__________╲ BR corner
 *    │      leg-inner  leg-bottom
 *    │    junction
 *    │     │
 *    BL────┘  stem bottom
 */
function makeROuterPath(cx: number, cy: number, rs: number) {
  const p = Skia.Path.Make();
  const sx = (v: number) => cx + (v - 22) * rs;
  const sy = (v: number) => cy + (v - 30) * rs;

  p.moveTo(sx(0), sy(0));        // TL
  p.lineTo(sx(26), sy(0));       // top edge
  p.cubicTo(                     // bowl outer arc (D-shape)
    sx(44), sy(0),
    sx(44), sy(32),
    sx(26), sy(32),
  );
  p.lineTo(sx(44), sy(60));      // leg outer → BR corner
  p.lineTo(sx(32), sy(60));      // leg bottom (inward)
  p.lineTo(sx(19), sy(32));      // leg inner → back up to junction
  p.lineTo(sx(13), sy(32));      // across notch to stem right
  p.lineTo(sx(13), sy(60));      // stem right side down
  p.lineTo(sx(0),  sy(60));      // stem bottom
  p.close();                     // up left side back to TL
  return p;
}

/**
 * Counter: D-shaped hole inside the bowl.
 * Drawn filled with BG_COLOR so it appears transparent (punch-out technique).
 * Also gets a glowing stroke so the inner bowl edge shines like in splash.png.
 *
 * Reference coords: inset ~7 px from the outer bowl on all sides.
 */
function makeRCounterPath(cx: number, cy: number, rs: number) {
  const p = Skia.Path.Make();
  const sx = (v: number) => cx + (v - 22) * rs;
  const sy = (v: number) => cy + (v - 30) * rs;

  // Two-cubic D-shape: starts/ends at bottom-left (20, 27)
  p.moveTo(sx(20), sy(27));
  p.cubicTo(sx(17), sy(18), sx(23), sy(6),  sx(30), sy(6));   // left arc → top
  p.cubicTo(sx(39), sy(6),  sx(39), sy(27), sx(20), sy(27));  // right arc → bottom
  p.close();
  return p;
}

// ─── component ───────────────────────────────────────────────────────────────
type ReclaimLogoProps = { size?: number };

export function ReclaimLogo({ size = 224 }: ReclaimLogoProps) {
  const progress = useSharedValue(0);
  const scale = size / SIZE;

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const center = CENTER * scale;
  /** R drawn at 92 % of the canvas scale so it sits comfortably inside rings */
  const rScale = 0.92 * scale;

  const ringPaths = useMemo(
    () => RINGS.map(r =>
      makeEllipsePath(r.rx * scale, r.ry * scale, r.rot, center),
    ),
    [scale, center],
  );

  const rOuter   = useMemo(() => makeROuterPath(center, center, rScale),   [center, rScale]);
  const rCounter = useMemo(() => makeRCounterPath(center, center, rScale), [center, rScale]);

  // ── orb positions (one useDerivedValue per coordinate) ───────────────────
  const orb1X = useDerivedValue(() => {
    const r = RINGS[ORBS[0].ring];
    return getPointOnEllipse(
      r.rx * scale, r.ry * scale, r.rot,
      ORBS[0].angle + progress.value * 2 * Math.PI,
      center,
    ).x;
  });
  const orb1Y = useDerivedValue(() => {
    const r = RINGS[ORBS[0].ring];
    return getPointOnEllipse(
      r.rx * scale, r.ry * scale, r.rot,
      ORBS[0].angle + progress.value * 2 * Math.PI,
      center,
    ).y;
  });
  const orb2X = useDerivedValue(() => {
    const r = RINGS[ORBS[1].ring];
    return getPointOnEllipse(
      r.rx * scale, r.ry * scale, r.rot,
      ORBS[1].angle + progress.value * 2 * Math.PI,
      center,
    ).x;
  });
  const orb2Y = useDerivedValue(() => {
    const r = RINGS[ORBS[1].ring];
    return getPointOnEllipse(
      r.rx * scale, r.ry * scale, r.rot,
      ORBS[1].angle + progress.value * 2 * Math.PI,
      center,
    ).y;
  });
  const orb3X = useDerivedValue(() => {
    const r = RINGS[ORBS[2].ring];
    return getPointOnEllipse(
      r.rx * scale, r.ry * scale, r.rot,
      ORBS[2].angle + progress.value * 2 * Math.PI,
      center,
    ).x;
  });
  const orb3Y = useDerivedValue(() => {
    const r = RINGS[ORBS[2].ring];
    return getPointOnEllipse(
      r.rx * scale, r.ry * scale, r.rot,
      ORBS[2].angle + progress.value * 2 * Math.PI,
      center,
    ).y;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* ── DRAW ORDER ─────────────────────────────────────────────────────
          1. Rings  (behind R)
          2. R body fill  (dark navy, covers rings in R area)
          3. Counter punch-out  (BG colour — restores hole appearance)
          4. R outer glow stroke
          5. R outer crisp stroke
          6. Counter inner glow stroke  (inner bowl edge gleam)
          7. Orbs  (on top of everything)
      ─────────────────────────────────────────────────────────────────── */}

      {/* 1 ── Rings */}
      {ringPaths.map((path, i) => (
        <Group key={i}>
          <Path path={path} color={RING_COLOR} style="stroke" strokeWidth={4 * scale}>
            <BlurMask blur={7} style="solid" />
          </Path>
          <Path path={path} color={RING_COLOR} style="stroke" strokeWidth={2 * scale} />
        </Group>
      ))}

      {/* 2 ── R body fill */}
      <Path path={rOuter} color={R_BODY} />

      {/* 3 ── Counter punch-out (restores hole by painting BG colour) */}
      <Path path={rCounter} color={BG_COLOR} />

      {/* 4 ── R outer glow */}
      <Path path={rOuter} color={R_GLOW} style="stroke" strokeWidth={3.5 * scale}>
        <BlurMask blur={6} style="solid" />
      </Path>

      {/* 5 ── R outer crisp stroke */}
      <Path path={rOuter} color={R_GLOW} style="stroke" strokeWidth={2 * scale} />

      {/* 6 ── Counter inner glow (the bowl hole shines with ring colour) */}
      <Path path={rCounter} color={RING_COLOR} style="stroke" strokeWidth={1.5 * scale}>
        <BlurMask blur={4} style="solid" />
      </Path>

      {/* 7 ── Orbs */}
      {[
        { x: orb1X, y: orb1Y },
        { x: orb2X, y: orb2Y },
        { x: orb3X, y: orb3Y },
      ].map((orb, i) => (
        <Group key={i}>
          <Circle cx={orb.x} cy={orb.y} r={7 * scale} color={ORB_GLOW}>
            <BlurMask blur={10} style="solid" />
          </Circle>
          <Circle cx={orb.x} cy={orb.y} r={4.5 * scale} color={ORB_WHITE} />
        </Group>
      ))}
    </Canvas>
  );
}
