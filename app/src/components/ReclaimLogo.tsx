/**
 * ReclaimLogo — Animated Skia splash/loading logo.
 *
 * Reference: assets/splash.png
 *   • 3 overlapping elliptical rings (vertical + ±45° diagonals)
 *   • 3 orbiting white orbs
 *   • Bold capital R centred inside the rings
 *
 * R geometry (reference box 50 × 52, centre at 25, 26):
 *   • Stem:  x 0–13 (26 % of width)
 *   • Bowl:  two-cubic half-ellipse  (28, 0) → (50, 13) → (28, 26)
 *             ellipse centre (28,13), rx = 22, ry = 13
 *             — proper circular arc via k = 0.5523 Bézier approximation
 *   • Leg:   diagonal (28,26)→(50,52) / inner (22,26)→(38,52)
 *   • Counter (D-hole): flat left at x=13, two-cubic arc right side
 *             (24,5)→(40,12)→(24,20)
 *
 * R is drawn using the punch-out technique:
 *   1. Solid dark-navy body fill (covers ring segments)
 *   2. Counter painted in BG colour  → looks like a hole
 *   3. Neon-blue glow + crisp stroke on outer silhouette
 *   4. Neon-blue glow on counter inner edge
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
const SIZE   = 224;
const CENTER = SIZE / 2; // 112

// ─── colours ─────────────────────────────────────────────────────────────────
const RING_COLOR = '#60a5fa';
const R_BODY     = '#0e2246';   // dark navy body
const BG_COLOR   = '#0b1220';   // must match loading-screen background
const R_GLOW     = '#93c5fd';   // neon-blue outline / glow
const ORB_WHITE  = '#ffffff';
const ORB_GLOW   = 'rgba(147, 197, 253, 0.9)';

// ─── rings ───────────────────────────────────────────────────────────────────
const RINGS = [
  { rx: 56, ry: 26, rot: 90  }, // vertical
  { rx: 56, ry: 26, rot: -45 }, // left diagonal
  { rx: 56, ry: 26, rot: 45  }, // right diagonal
] as const;

// ─── orbs ────────────────────────────────────────────────────────────────────
const ORBS = [
  { ring: 0, angle: Math.PI * 1.5 }, // top (vertical ring)
  { ring: 1, angle: Math.PI * 0.7 }, // bottom-left
  { ring: 2, angle: Math.PI * 0.3 }, // bottom-right
] as const;

// ─── ellipse helpers ──────────────────────────────────────────────────────────
function getPointOnEllipse(
  rx: number, ry: number, rotDeg: number, angle: number, center: number,
): { x: number; y: number } {
  'worklet';
  const lx  = rx * Math.cos(angle);
  const ly  = ry * Math.sin(angle);
  const rad = (rotDeg * Math.PI) / 180;
  return {
    x: center + lx * Math.cos(rad) - ly * Math.sin(rad),
    y: center + lx * Math.sin(rad) + ly * Math.cos(rad),
  };
}

function makeEllipsePath(rx: number, ry: number, rotDeg: number, center: number) {
  const p   = Skia.Path.Make();
  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const t  = (i / steps) * 2 * Math.PI;
    const lx = rx * Math.cos(t);
    const ly = ry * Math.sin(t);
    const px = center + lx * cos - ly * sin;
    const py = center + lx * sin + ly * cos;
    if (i === 0) p.moveTo(px, py); else p.lineTo(px, py);
  }
  p.close();
  return p;
}

// ─── R path builders ──────────────────────────────────────────────────────────
/**
 * Reference box: 50 wide × 52 tall, centre (25, 26).
 * Bowl arc: proper half-ellipse via two k=0.5523 Bézier cubics.
 *   Ellipse centre (28, 13), rx=22, ry=13
 *   Q1: (28,0) → ctrl(40,0)(50,6) → (50,13)
 *   Q2: (50,13) → ctrl(50,20)(40,26) → (28,26)
 */
function makeROuterPath(cx: number, cy: number, rs: number) {
  const p  = Skia.Path.Make();
  const sx = (v: number) => cx + (v - 25) * rs;
  const sy = (v: number) => cy + (v - 26) * rs;

  p.moveTo(sx(0),  sy(0));         // TL
  p.lineTo(sx(28), sy(0));         // top edge → bowl start

  // Bowl: half-ellipse — upper quarter
  p.cubicTo(sx(40), sy(0),  sx(50), sy(6),  sx(50), sy(13));
  // Bowl: half-ellipse — lower quarter
  p.cubicTo(sx(50), sy(20), sx(40), sy(26), sx(28), sy(26));

  // Leg outer diagonal → bottom-right corner
  p.lineTo(sx(50), sy(52));
  // Leg bottom inward
  p.lineTo(sx(38), sy(52));
  // Leg inner diagonal back up to notch
  p.lineTo(sx(22), sy(26));
  // Notch: across to stem right edge
  p.lineTo(sx(13), sy(26));
  // Stem right side down
  p.lineTo(sx(13), sy(52));
  // Stem bottom
  p.lineTo(sx(0),  sy(52));
  p.close();
  return p;
}

/**
 * Counter (D-shaped hole inside the bowl).
 * Flat left edge at x=13, two-cubic half-ellipse on the right.
 * Ellipse centre (24, 12.5), rx=16, ry=7.5
 *   Q1: (24,5) → ctrl(33,5)(40,8) → (40,12)
 *   Q2: (40,12) → ctrl(40,16)(33,20) → (24,20)
 * Bottom back to (13,20), close → flat left edge.
 */
function makeRCounterPath(cx: number, cy: number, rs: number) {
  const p  = Skia.Path.Make();
  const sx = (v: number) => cx + (v - 25) * rs;
  const sy = (v: number) => cy + (v - 26) * rs;

  p.moveTo(sx(13), sy(5));         // top-left of counter
  p.lineTo(sx(24), sy(5));         // top edge

  // Counter arc — upper quarter
  p.cubicTo(sx(33), sy(5),  sx(40), sy(8),  sx(40), sy(12));
  // Counter arc — lower quarter
  p.cubicTo(sx(40), sy(16), sx(33), sy(20), sx(24), sy(20));

  p.lineTo(sx(13), sy(20));        // bottom edge
  p.close();                       // flat left side
  return p;
}

// ─── component ───────────────────────────────────────────────────────────────
type ReclaimLogoProps = { size?: number };

export function ReclaimLogo({ size = 224 }: ReclaimLogoProps) {
  const progress = useSharedValue(0);
  const scale    = size / SIZE;

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const center = CENTER * scale;
  /**
   * rScale maps the 50-unit reference box to canvas space.
   * 0.84 × scale keeps the R comfortably inside the rings while
   * matching the reference proportions (≈ 37 px wide at SIZE=224).
   */
  const rScale = 0.84 * scale;

  const ringPaths = useMemo(
    () => RINGS.map(r => makeEllipsePath(r.rx * scale, r.ry * scale, r.rot, center)),
    [scale, center],
  );

  const rOuter   = useMemo(() => makeROuterPath(center, center, rScale),   [center, rScale]);
  const rCounter = useMemo(() => makeRCounterPath(center, center, rScale), [center, rScale]);

  // Orb positions — one useDerivedValue pair per orb
  const orb1X = useDerivedValue(() => {
    const ring = RINGS[ORBS[0].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot,
      ORBS[0].angle + progress.value * 2 * Math.PI, center).x;
  });
  const orb1Y = useDerivedValue(() => {
    const ring = RINGS[ORBS[0].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot,
      ORBS[0].angle + progress.value * 2 * Math.PI, center).y;
  });
  const orb2X = useDerivedValue(() => {
    const ring = RINGS[ORBS[1].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot,
      ORBS[1].angle + progress.value * 2 * Math.PI, center).x;
  });
  const orb2Y = useDerivedValue(() => {
    const ring = RINGS[ORBS[1].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot,
      ORBS[1].angle + progress.value * 2 * Math.PI, center).y;
  });
  const orb3X = useDerivedValue(() => {
    const ring = RINGS[ORBS[2].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot,
      ORBS[2].angle + progress.value * 2 * Math.PI, center).x;
  });
  const orb3Y = useDerivedValue(() => {
    const ring = RINGS[ORBS[2].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot,
      ORBS[2].angle + progress.value * 2 * Math.PI, center).y;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      {/*
       * Draw order:
       *  1  Rings (behind R)
       *  2  R body fill (dark navy — covers ring segments in R area)
       *  3  Counter punch-out (BG colour — restores hole appearance)
       *  4  R outer glow stroke
       *  5  R outer crisp stroke
       *  6  Counter inner glow (bowl-hole edge gleam)
       *  7  Orbs (on top of everything)
       */}

      {/* 1 ── Rings */}
      {ringPaths.map((path, i) => (
        <Group key={i}>
          <Path path={path} color={RING_COLOR} style="stroke" strokeWidth={4.5 * scale}>
            <BlurMask blur={8} style="solid" />
          </Path>
          <Path path={path} color={RING_COLOR} style="stroke" strokeWidth={2.5 * scale} />
        </Group>
      ))}

      {/* 2 ── R body fill */}
      <Path path={rOuter} color={R_BODY} />

      {/* 3 ── Counter punch-out */}
      <Path path={rCounter} color={BG_COLOR} />

      {/* 4 ── R outer glow */}
      <Path path={rOuter} color={R_GLOW} style="stroke" strokeWidth={4 * scale}>
        <BlurMask blur={7} style="solid" />
      </Path>

      {/* 5 ── R outer crisp stroke */}
      <Path path={rOuter} color={R_GLOW} style="stroke" strokeWidth={2 * scale} />

      {/* 6 ── Counter inner glow */}
      <Path path={rCounter} color={RING_COLOR} style="stroke" strokeWidth={2 * scale}>
        <BlurMask blur={4} style="solid" />
      </Path>

      {/* 7 ── Orbs */}
      {([
        { x: orb1X, y: orb1Y },
        { x: orb2X, y: orb2Y },
        { x: orb3X, y: orb3Y },
      ] as const).map((orb, i) => (
        <Group key={i}>
          <Circle cx={orb.x} cy={orb.y} r={8 * scale} color={ORB_GLOW}>
            <BlurMask blur={12} style="solid" />
          </Circle>
          <Circle cx={orb.x} cy={orb.y} r={5 * scale} color={ORB_WHITE} />
        </Group>
      ))}
    </Canvas>
  );
}
