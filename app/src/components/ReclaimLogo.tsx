/**
 * ReclaimLogo — Animated atom-style logo.
 *
 * Orb paths come directly from RECLAIM_PATH_D via ContourMeasureIter.
 * The three orbital rings are identified as the three contours with the most
 * similar arc lengths among ring-sized candidates — because all three rings
 * are identical rotated ellipses, so their perimeters are equal.
 */
import React, { useEffect, useMemo } from 'react';
import {
  Canvas,
  Group,
  Path,
  Rect,
  Circle,
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
import { RECLAIM_PATH_D, RECLAIM_VIEWBOX } from '../lib/reclaimSvgPath';

// ── Canvas ─────────────────────────────────────────────────────────────────────
const SIZE = 270; // default canvas (RootNavigator calls with size={360})

// ── Colours (matched to assets/splash.png) ─────────────────────────────────────
const BG          = '#0b1220';
const LOGO_FILL   = '#2274C9';
const GLOW_ATMOS  = 'rgba(28,  96, 200, 0.18)';
const GLOW_MED    = 'rgba(65, 155, 255, 0.50)';
const GLOW_BRIGHT = 'rgba(185, 225, 255, 0.88)';
const EDGE_WHITE  = '#FFFFFF';
const ORB_CORE    = '#ffffff';
const ORB_HALO    = 'rgba(200, 238, 255, 0.90)';

const ORBIT_SAMPLES = 400;
// Full ring perimeter ≈ 2π × √((73²+55²)/2) ≈ 406 SVG units. Require near-full loops.
const MIN_RING_LEN = 280;
const MAX_RING_LEN = 520;

type Point = { x: number; y: number };

/**
 * Scan every contour in the logo path and return the three ring contours.
 *
 * Strategy: the three orbital rings are identical rotated ellipses → same
 * perimeter → the "tightest triple" (smallest max−min spread) among
 * ring-sized contours is the three rings.
 *
 * Points are returned in SVG/viewBox space so orbs can be drawn inside the
 * logo Group and scale with the logo.
 */
function sampleThreeRings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path: any,
): [Point[], Point[], Point[]] {
  const empty: Point[] = [];
  if (!path) return [empty, empty, empty];

  // 1. Collect all contours
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Entry = { cont: any; len: number };
  const all: Entry[] = [];
  // forceClosed: true so each contour length is a full loop; orbs then trace complete rings.
  const iter = Skia.ContourMeasureIter(path, true, 1);
  let c = iter.next();
  while (c != null) {
    all.push({ cont: c, len: c.length() });
    c = iter.next();
  }
  if (all.length < 3) return [empty, empty, empty];

  // 2. Sort longest-first; keep only full-ring-sized contours (one ring ≈ 406 units).
  all.sort((a, b) => b.len - a.len);
  const candidates = all.filter((e) => e.len >= MIN_RING_LEN && e.len <= MAX_RING_LEN);
  if (candidates.length < 3) return [empty, empty, empty];

  // 3. Among the top-12 candidates find the triple with smallest length spread
  const pool = candidates.slice(0, Math.min(12, candidates.length));
  let bestTriple = [0, 1, 2];
  let bestSpread = Infinity;
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      for (let k = j + 1; k < pool.length; k++) {
        const spread = pool[i].len - pool[k].len;
        if (spread < bestSpread) {
          bestSpread = spread;
          bestTriple = [i, j, k];
        }
      }
    }
  }

  // 4. Sample evenly-spaced points in SVG space (no scale/translate)
  const sampleContour = (idx: number): Point[] => {
    const { cont, len } = pool[idx];
    if (!cont || len <= 0) return empty;
    const pts: Point[] = [];
    for (let i = 0; i < ORBIT_SAMPLES; i++) {
      const d = (len * i) / ORBIT_SAMPLES;
      const [pos] = cont.getPosTan(d);
      pts.push({ x: pos.x, y: pos.y });
    }
    return pts;
  };

  return [
    sampleContour(bestTriple[0]),
    sampleContour(bestTriple[1]),
    sampleContour(bestTriple[2]),
  ];
}

type ReclaimLogoProps = { size?: number };

export function ReclaimLogo({ size = SIZE }: ReclaimLogoProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress]);

  const { path, transform, ring0, ring1, ring2 } = useMemo(() => {
    const p = Skia.Path.MakeFromSVGString(RECLAIM_PATH_D);
    const [,, vbW, vbH] = RECLAIM_VIEWBOX;
    const s  = Math.min(size / vbW, size / vbH);
    const tx = (size - vbW * s) / 2;
    const ty = (size - vbH * s) / 2;
    const [r0, r1, r2] = sampleThreeRings(p);
    return {
      path: p ?? Skia.Path.Make(),
      transform: [{ scale: s }, { translateX: tx }, { translateY: ty }],
      ring0: r0,
      ring1: r1,
      ring2: r2,
    };
  }, [size]);

  const N = ORBIT_SAMPLES;

  const orb0x = useDerivedValue(() => {
    const i = Math.floor((progress.value % 1) * N) % N;
    return ring0[i]?.x ?? 0;
  }, [ring0, N]);
  const orb0y = useDerivedValue(() => {
    const i = Math.floor((progress.value % 1) * N) % N;
    return ring0[i]?.y ?? 0;
  }, [ring0, N]);

  const orb1x = useDerivedValue(() => {
    const i = Math.floor((progress.value % 1) * N) % N;
    return ring1[i]?.x ?? 0;
  }, [ring1, N]);
  const orb1y = useDerivedValue(() => {
    const i = Math.floor((progress.value % 1) * N) % N;
    return ring1[i]?.y ?? 0;
  }, [ring1, N]);

  const orb2x = useDerivedValue(() => {
    const i = Math.floor((progress.value % 1) * N) % N;
    return ring2[i]?.x ?? 0;
  }, [ring2, N]);
  const orb2y = useDerivedValue(() => {
    const i = Math.floor((progress.value % 1) * N) % N;
    return ring2[i]?.y ?? 0;
  }, [ring2, N]);

  // Orb radii in SVG units so they scale with the logo (inside the Group)
  const ORB_R_HALO = 8;
  const ORB_R_CORE = 5;

  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={0} y={0} width={size} height={size} color={BG} />

      {/* ── Logo + orbs in same Group so they share scale/translate ── */}
      <Group transform={transform}>
        <Path path={path} color={GLOW_ATMOS} style="stroke" strokeWidth={5.0}>
          <BlurMask blur={22} style="solid" />
        </Path>
        <Path path={path} color={GLOW_MED} style="stroke" strokeWidth={3.0}>
          <BlurMask blur={9} style="solid" />
        </Path>
        <Path path={path} color={LOGO_FILL} />
        <Path path={path} color={GLOW_BRIGHT} style="stroke" strokeWidth={1.4}>
          <BlurMask blur={3.5} style="solid" />
        </Path>
        <Path path={path} color={EDGE_WHITE} style="stroke" strokeWidth={0.65} />
        {/* Orbs in SVG space → scaled with logo */}
        {(
          [
            { x: orb0x, y: orb0y },
            { x: orb1x, y: orb1y },
            { x: orb2x, y: orb2y },
          ] as const
        ).map((orb, i) => (
          <Group key={i}>
            <Circle cx={orb.x} cy={orb.y} r={ORB_R_HALO} color={ORB_HALO}>
              <BlurMask blur={12} style="solid" />
            </Circle>
            <Circle cx={orb.x} cy={orb.y} r={ORB_R_CORE} color={ORB_CORE} />
          </Group>
        ))}
      </Group>
    </Canvas>
  );
}
