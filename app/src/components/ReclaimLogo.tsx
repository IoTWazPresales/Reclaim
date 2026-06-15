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
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import { RECLAIM_PATH_D, RECLAIM_VIEWBOX } from '../lib/reclaimSvgPath';

const SIZE = 270;

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
const VISUAL_NUDGE_X = -4;
const CENTER_RING_PATH_D =
  'M 140.93104,135.93896 A 31.698263,66.914421 0 0 1 109.23278,202.85339 31.698263,66.914421 0 0 1 77.534517,135.93896 31.698263,66.914421 0 0 1 109.23278,69.024544 31.698263,66.914421 0 0 1 140.93104,135.93896 Z';
const LEFT_RING_PATH_D =
  'M 125.59616,158.34781 C 97.275252,180.93961 66.265681,192.53015 55.308239,179.42685 44.350821,166.32352 61.695956,134.01747 87.106465,113.01316 115.02979,89.931759 153.08959,77.305469 164.04702,90.408777 175.00442,103.51211 153.91707,135.756 125.59616,158.34781 Z';
const RIGHT_RING_PATH_D =
  'm 132.07411,112.49139 c 27.72196,21.94852 41.27772,58.05382 31.35799,67.54554 C 151.09069,191.84585 119.213,179.529 93.863606,158.451 66.007395,135.28862 44.826995,103.66745 55.672774,90.471584 66.518601,77.275744 104.20639,90.427471 132.07411,112.49139 Z';

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

function sampleTrackFromSvgPath(pathD: string, samples: number): Point[] {
  const path = Skia.Path.MakeFromSVGString(pathD);
  if (!path) return [];
  const iter = Skia.ContourMeasureIter(path, true, 1);
  const contour = iter.next();
  if (!contour) return [];
  const length = contour.length();
  if (!Number.isFinite(length) || length <= 0) return [];
  return sampleContour(contour, length, samples);
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

type ReclaimLogoProps = {
  size?: number;
  /** When set, fills the canvas square; omit for transparent (blends with parent splash). */
  backgroundColor?: string | null;
  animate?: boolean;
};

export function ReclaimLogo({ size = SIZE, backgroundColor = null, animate = true }: ReclaimLogoProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(progress);
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: ORBIT_DURATION_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [animate, progress]);

  const { path, transform, tracks } = useMemo(() => {
    const p = Skia.Path.MakeFromSVGString(RECLAIM_PATH_D);
    const [vbX, vbY, vbW, vbH] = RECLAIM_VIEWBOX;
    const bounds = p?.getBounds();
    const hasBounds =
      !!bounds &&
      Number.isFinite(bounds.width) &&
      Number.isFinite(bounds.height) &&
      bounds.width > 0 &&
      bounds.height > 0;
    const s = Math.min(size / vbW, size / vbH);
    // Keep stable viewBox-fit behavior, then apply only center bias correction.
    let tx = (size - vbW * s) / 2 - vbX * s;
    let ty = (size - vbH * s) / 2 - vbY * s;
    if (hasBounds) {
      const vbCx = vbX + vbW / 2;
      const vbCy = vbY + vbH / 2;
      const pathCx = bounds.x + bounds.width / 2;
      const pathCy = bounds.y + bounds.height / 2;
      tx += (vbCx - pathCx) * s;
      ty += (vbCy - pathCy) * s;
    }
    tx += VISUAL_NUDGE_X;
    const ringTracks = extractRingTracksFromPath(p, vbX, vbY, vbW, vbH);
    const centerRingTrack = sampleTrackFromSvgPath(CENTER_RING_PATH_D, ORBIT_SAMPLES);
    if (centerRingTrack.length > 0) {
      ringTracks[0] = centerRingTrack;
    }
    const leftRingTrack = sampleTrackFromSvgPath(LEFT_RING_PATH_D, ORBIT_SAMPLES);
    if (leftRingTrack.length > 0) {
      ringTracks[1] = leftRingTrack;
    }
    const rightRingTrack = sampleTrackFromSvgPath(RIGHT_RING_PATH_D, ORBIT_SAMPLES);
    if (rightRingTrack.length > 0) {
      ringTracks[2] = rightRingTrack;
    }
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
      {backgroundColor ? <Rect x={0} y={0} width={size} height={size} color={backgroundColor} /> : null}

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
