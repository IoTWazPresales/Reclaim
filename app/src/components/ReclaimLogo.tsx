/**
 * ReclaimLogo - Animated Skia logo for loading screen.
 * Central "R" with 3 elliptical rings and 3 orbiting balls, matching splash.png.
 */

import React, { useEffect, useMemo } from 'react';
import { Canvas, Group, Circle, Path, BlurMask, Skia, Text, matchFont } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';

const SIZE = 160;
const CENTER = SIZE / 2;

// Splash colors
const R_BLUE = '#3b82f6';
const R_GLOW = 'rgba(59, 130, 246, 0.5)';
const RING_BLUE = '#60a5fa';
const ORB_WHITE = '#ffffff';
const ORB_GLOW = 'rgba(255, 255, 255, 0.6)';

// Ring params: rx, ry, rotation (deg). Ellipses centered at CENTER.
const RING_1 = { rx: 42, ry: 28, rot: 0 };     // horizontal
const RING_2 = { rx: 42, ry: 28, rot: -38 };   // diagonal tl-br
const RING_3 = { rx: 42, ry: 28, rot: 38 };    // diagonal tr-bl

// Orb positions: ring index (0,1,2), angle on ellipse (radians, 0=right, π/2=bottom)
const ORBS = [
  { ring: 2, angle: 4.2 },   // bottom-left (ring 3)
  { ring: 1, angle: 5.2 },   // bottom-right (ring 2)
  { ring: 0, angle: 0.9 },   // top-right (ring 1), slightly behind
];

function getPointOnEllipse(
  rx: number,
  ry: number,
  rotDeg: number,
  angle: number,
  center: number
): { x: number; y: number } {
  'worklet';
  const x = rx * Math.cos(angle);
  const y = ry * Math.sin(angle);
  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: center + x * cos - y * sin,
    y: center + x * sin + y * cos,
  };
}

function makeEllipsePath(rx: number, ry: number, rotDeg: number, center: number) {
  const p = Skia.Path.Make();
  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const x = rx * Math.cos(t);
    const y = ry * Math.sin(t);
    const px = center + x * cos - y * sin;
    const py = center + x * sin + y * cos;
    if (i === 0) p.moveTo(px, py);
    else p.lineTo(px, py);
  }
  p.close();
  return p;
}

type ReclaimLogoProps = {
  size?: number;
};

export function ReclaimLogo({ size = 160 }: ReclaimLogoProps) {
  const progress = useSharedValue(0);
  const scale = size / SIZE;

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const font = useMemo(
    () =>
      matchFont({
        fontFamily: 'System',
        fontSize: 48 * scale,
        fontWeight: '700',
      }),
    [scale]
  );

  const center = CENTER * scale;
  const ringPaths = useMemo(
    () => [
      makeEllipsePath(RING_1.rx * scale, RING_1.ry * scale, RING_1.rot, center),
      makeEllipsePath(RING_2.rx * scale, RING_2.ry * scale, RING_2.rot, center),
      makeEllipsePath(RING_3.rx * scale, RING_3.ry * scale, RING_3.rot, center),
    ],
    [scale, center]
  );

  const orb1X = useDerivedValue(() => {
    const angle = ORBS[0].angle + progress.value * 2 * Math.PI;
    const r = ORBS[0].ring === 0 ? RING_1 : ORBS[0].ring === 1 ? RING_2 : RING_3;
    return getPointOnEllipse(r.rx * scale, r.ry * scale, r.rot, angle, center).x;
  });
  const orb1Y = useDerivedValue(() => {
    const angle = ORBS[0].angle + progress.value * 2 * Math.PI;
    const r = ORBS[0].ring === 0 ? RING_1 : ORBS[0].ring === 1 ? RING_2 : RING_3;
    return getPointOnEllipse(r.rx * scale, r.ry * scale, r.rot, angle, center).y;
  });
  const orb2X = useDerivedValue(() => {
    const angle = ORBS[1].angle + progress.value * 2 * Math.PI;
    const r = ORBS[1].ring === 0 ? RING_1 : ORBS[1].ring === 1 ? RING_2 : RING_3;
    return getPointOnEllipse(r.rx * scale, r.ry * scale, r.rot, angle, center).x;
  });
  const orb2Y = useDerivedValue(() => {
    const angle = ORBS[1].angle + progress.value * 2 * Math.PI;
    const r = ORBS[1].ring === 0 ? RING_1 : ORBS[1].ring === 1 ? RING_2 : RING_3;
    return getPointOnEllipse(r.rx * scale, r.ry * scale, r.rot, angle, center).y;
  });
  const orb3X = useDerivedValue(() => {
    const angle = ORBS[2].angle + progress.value * 2 * Math.PI;
    const r = ORBS[2].ring === 0 ? RING_1 : ORBS[2].ring === 1 ? RING_2 : RING_3;
    return getPointOnEllipse(r.rx * scale, r.ry * scale, r.rot, angle, center).x;
  });
  const orb3Y = useDerivedValue(() => {
    const angle = ORBS[2].angle + progress.value * 2 * Math.PI;
    const r = ORBS[2].ring === 0 ? RING_1 : ORBS[2].ring === 1 ? RING_2 : RING_3;
    return getPointOnEllipse(r.rx * scale, r.ry * scale, r.rot, angle, center).y;
  });

  const textX = CENTER * scale - (font.measureText('R').width ?? 12 * scale) / 2;
  const textY = CENTER * scale + (font.getSize() ?? 48 * scale) * 0.35;

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group>
        {/* R glow */}
        <Circle cx={CENTER * scale} cy={CENTER * scale} r={28 * scale} color={R_GLOW}>
          <BlurMask blur={16} style="solid" />
        </Circle>

        {/* Rings */}
        {ringPaths.map((path, i) => (
          <Path
            key={i}
            path={path}
            color={RING_BLUE}
            style="stroke"
            strokeWidth={1.5}
          />
        ))}

        {/* Orbs - draw top-right (behind) first, then others */}
        <Circle cx={orb3X} cy={orb3Y} r={5 * scale} color={ORB_GLOW}>
          <BlurMask blur={6} style="solid" />
        </Circle>
        <Circle cx={orb3X} cy={orb3Y} r={4 * scale} color={ORB_WHITE} />
        <Circle cx={orb1X} cy={orb1Y} r={5 * scale} color={ORB_GLOW}>
          <BlurMask blur={6} style="solid" />
        </Circle>
        <Circle cx={orb1X} cy={orb1Y} r={4 * scale} color={ORB_WHITE} />
        <Circle cx={orb2X} cy={orb2Y} r={5 * scale} color={ORB_GLOW}>
          <BlurMask blur={6} style="solid" />
        </Circle>
        <Circle cx={orb2X} cy={orb2Y} r={4 * scale} color={ORB_WHITE} />

        {/* Central R */}
        <Text x={textX} y={textY} text="R" font={font} color={R_BLUE} />
      </Group>
    </Canvas>
  );
}
