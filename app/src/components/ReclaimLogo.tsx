/**
 * ReclaimLogo — Animated atom-style logo.
 *
 * Orb paths use deterministic analytic ellipses in SVG/viewBox space.
 * This avoids brittle contour heuristics that can return empty paths.
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
import { generateReclaimOrbitalPaths } from './reclaimLogoOrbitPaths';

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

const ORBIT_SAMPLES = 480;

type ReclaimLogoProps = { size?: number };

export function ReclaimLogo({ size = SIZE }: ReclaimLogoProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 6200, easing: Easing.linear }),
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
    const [r0, r1, r2] = generateReclaimOrbitalPaths(ORBIT_SAMPLES);
    return {
      path: p ?? Skia.Path.Make(),
      transform: [{ scale: s }, { translateX: tx }, { translateY: ty }],
      ring0: r0,
      ring1: r1,
      ring2: r2,
    };
  }, [size]);

  const N = ORBIT_SAMPLES;

  const sampleOrbit = (ring: typeof ring0, phase: number) => {
    'worklet';
    const idx = ((progress.value + phase) % 1 + 1) % 1;
    const t = idx * N;
    const i0 = Math.floor(t) % N;
    const i1 = (i0 + 1) % N;
    const frac = t - Math.floor(t);
    const p0 = ring[i0];
    const p1 = ring[i1];
    return {
      x: p0.x + (p1.x - p0.x) * frac,
      y: p0.y + (p1.y - p0.y) * frac,
    };
  };

  const orb0x = useDerivedValue(() => {
    return sampleOrbit(ring0, 0.02).x;
  }, [ring0, N]);
  const orb0y = useDerivedValue(() => {
    return sampleOrbit(ring0, 0.02).y;
  }, [ring0, N]);

  const orb1x = useDerivedValue(() => {
    return sampleOrbit(ring1, 0.36).x;
  }, [ring1, N]);
  const orb1y = useDerivedValue(() => {
    return sampleOrbit(ring1, 0.36).y;
  }, [ring1, N]);

  const orb2x = useDerivedValue(() => {
    return sampleOrbit(ring2, 0.69).x;
  }, [ring2, N]);
  const orb2y = useDerivedValue(() => {
    return sampleOrbit(ring2, 0.69).y;
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
