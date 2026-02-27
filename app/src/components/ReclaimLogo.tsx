/**
 * ReclaimLogo — Animated atom-style logo.
 *
 * Orb paths are extracted from the actual SVG ring contours when possible.
 * Fallback analytic orbits are used only if contour extraction fails.
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

const SIZE = 270;

const BG = '#0b1220';
const LOGO_FILL = '#2274C9';
const GLOW_ATMOS = 'rgba(28,  96, 200, 0.18)';
const GLOW_MED = 'rgba(65, 155, 255, 0.50)';
const GLOW_BRIGHT = 'rgba(185, 225, 255, 0.88)';
const EDGE_WHITE = '#FFFFFF';
const ORB_CORE = '#ffffff';
const ORB_HALO = 'rgba(200, 238, 255, 0.90)';

const ORBIT_DURATION_MS = 6200;
const ORBIT_SAMPLES = 480;
const MIN_RING_LEN = 250;
const MAX_RING_LEN = 560;

type Point = { x: number; y: number };
type RingTracks = [Point[], Point[], Point[]];

type RingCandidate = {
  points: Point[];
  length: number;
  angle: number;
  centerDist: number;
};

const TARGET_ANGLES = [90, -45, 45] as const;

function normalizeAngle180(deg: number): number {
  let a = ((deg % 180) + 180) % 180;
  if (a > 90) a -= 180;
  return a;
}

function angleDistance(a: number, b: number): number {
  const da = normalizeAngle180(a);
  const db = normalizeAngle180(b);
  return Math.abs(da - db);
}

function principalAxisAngle(points: Point[]): number {
  const n = points.length;
  if (n < 2) return 0;
  let mx = 0;
  let my = 0;
  for (const p of points) {
    mx += p.x;
    my += p.y;
  }
  mx /= n;
  my /= n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return (theta * 180) / Math.PI;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sampleContour(contour: any, length: number, samples: number): Point[] {
  const count = Math.max(32, samples);
  const pts: Point[] = [];
  for (let i = 0; i < count; i++) {
    const d = (length * i) / count;
    const [pos] = contour.getPosTan(d);
    pts.push({ x: pos.x, y: pos.y });
  }
  return pts;
}

function makeFallbackTracks(vbX: number, vbY: number, vbW: number, vbH: number): RingTracks {
  const cx = vbX + vbW * 0.5;
  const cy = vbY + vbH * 0.5;
  const rx = vbW * 0.335;
  const ry = vbH * 0.25;

  const pointOn = (rotDeg: number, t: number): Point => {
    const a = t * Math.PI * 2;
    const ex = rx * Math.cos(a);
    const ey = ry * Math.sin(a);
    const theta = (rotDeg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    return {
      x: cx + ex * cosT - ey * sinT,
      y: cy + ex * sinT + ey * cosT,
    };
  };

  const mk = (rotDeg: number): Point[] =>
    Array.from({ length: ORBIT_SAMPLES }, (_, i) => pointOn(rotDeg, i / ORBIT_SAMPLES));

  return [mk(90), mk(-45), mk(45)];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRingTracksFromPath(path: any, vbX: number, vbY: number, vbW: number, vbH: number): RingTracks {
  const empty: RingTracks = [[], [], []];
  if (!path) return makeFallbackTracks(vbX, vbY, vbW, vbH);

  const cx = vbX + vbW * 0.5;
  const cy = vbY + vbH * 0.5;

  const candidates: RingCandidate[] = [];
  const iter = Skia.ContourMeasureIter(path, true, 1);
  let contour = iter.next();

  while (contour != null) {
    const length = contour.length();
    if (length >= MIN_RING_LEN && length <= MAX_RING_LEN) {
      const probe = sampleContour(contour, length, 120);
      if (probe.length > 0) {
        let px = 0;
        let py = 0;
        for (const p of probe) {
          px += p.x;
          py += p.y;
        }
        px /= probe.length;
        py /= probe.length;
        const centerDist = Math.hypot(px - cx, py - cy);
        if (centerDist < vbW * 0.2) {
          candidates.push({
            points: sampleContour(contour, length, ORBIT_SAMPLES),
            length,
            angle: principalAxisAngle(probe),
            centerDist,
          });
        }
      }
    }
    contour = iter.next();
  }

  if (candidates.length < 3) return makeFallbackTracks(vbX, vbY, vbW, vbH);

  const picked: Point[][] = [];
  const used = new Set<number>();

  for (const target of TARGET_ANGLES) {
    let bestIdx = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < candidates.length; i++) {
      if (used.has(i)) continue;
      const c = candidates[i];
      const score = angleDistance(c.angle, target) * 2.5 + c.centerDist * 0.08 + Math.abs(c.length - 406) * 0.03;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      used.add(bestIdx);
      picked.push(candidates[bestIdx].points);
    }
  }

  if (picked.length < 3 || picked.some((r) => r.length === 0)) {
    return makeFallbackTracks(vbX, vbY, vbW, vbH);
  }

  return [picked[0], picked[1], picked[2]];
}

function pointFromTrack(track: Point[], t: number): Point {
  'worklet';
  if (!track.length) return { x: 0, y: 0 };
  const n = track.length;
  const wrapped = ((t % 1) + 1) % 1;
  const f = wrapped * n;
  const i0 = Math.floor(f) % n;
  const i1 = (i0 + 1) % n;
  const r = f - Math.floor(f);
  const p0 = track[i0];
  const p1 = track[i1];
  return {
    x: p0.x + (p1.x - p0.x) * r,
    y: p0.y + (p1.y - p0.y) * r,
  };
}

type ReclaimLogoProps = { size?: number };

export function ReclaimLogo({ size = SIZE }: ReclaimLogoProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: ORBIT_DURATION_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress]);

  const { path, transform, tracks } = useMemo(() => {
    const p = Skia.Path.MakeFromSVGString(RECLAIM_PATH_D);
    const [vbX, vbY, vbW, vbH] = RECLAIM_VIEWBOX;
    const s = Math.min(size / vbW, size / vbH);
    const tx = (size - vbW * s) / 2;
    const ty = (size - vbH * s) / 2;
    const ringTracks = extractRingTracksFromPath(p, vbX, vbY, vbW, vbH);
    return {
      path: p ?? Skia.Path.Make(),
      transform: [{ scale: s }, { translateX: tx }, { translateY: ty }],
      tracks: ringTracks,
    };
  }, [size]);

  const orb0x = useDerivedValue(() => pointFromTrack(tracks[0], progress.value + 0.0).x, [tracks]);
  const orb0y = useDerivedValue(() => pointFromTrack(tracks[0], progress.value + 0.0).y, [tracks]);
  const orb1x = useDerivedValue(() => pointFromTrack(tracks[1], progress.value + 0.33).x, [tracks]);
  const orb1y = useDerivedValue(() => pointFromTrack(tracks[1], progress.value + 0.33).y, [tracks]);
  const orb2x = useDerivedValue(() => pointFromTrack(tracks[2], progress.value + 0.66).x, [tracks]);
  const orb2y = useDerivedValue(() => pointFromTrack(tracks[2], progress.value + 0.66).y, [tracks]);

  const ORB_R_HALO = 8;
  const ORB_R_CORE = 5;

  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={0} y={0} width={size} height={size} color={BG} />

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

        {([
          { x: orb0x, y: orb0y },
          { x: orb1x, y: orb1y },
          { x: orb2x, y: orb2y },
        ] as const).map((orb, i) => (
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
