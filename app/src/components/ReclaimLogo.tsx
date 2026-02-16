/**
 * ReclaimLogo - Animated Skia logo for loading screen.
 * Bold "R" with 4 elliptical rings (atom structure) and 3 orbiting balls, matching splash.png.
 * 
 * Structure:
 * - 4 rings: vertical, horizontal, left-slant (-45°), right-slant (+45°)
 * - 3 orbs: top of vertical ring, bottom-left on left-slant, bottom-right on right-slant
 * - Horizontal ring cuts through bottom of R
 * - NO background orb
 */

import React, { useEffect, useMemo } from 'react';
import { Canvas, Group, Circle, Path, BlurMask, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';

const SIZE = 160;
const CENTER = SIZE / 2;

// Splash colors - bright glowing blue
const R_BLUE = '#60a5fa';
const RING_BLUE = '#60a5fa';
const ORB_WHITE = '#ffffff';
const ORB_GLOW = 'rgba(255, 255, 255, 0.8)';

// 4 rings forming atom structure (all ellipses, various rotations)
// Ring sizes tuned to match splash.png proportions
const RINGS = [
  { rx: 52, ry: 28, rot: 90, name: 'vertical' },      // tall ellipse (vertical)
  { rx: 52, ry: 28, rot: 0, name: 'horizontal' },     // wide ellipse (horizontal)
  { rx: 52, ry: 28, rot: -45, name: 'left-slant' },   // left diagonal
  { rx: 52, ry: 28, rot: 45, name: 'right-slant' },   // right diagonal
];

// 3 orbs: top-center, bottom-left, bottom-right
// Orb positions: ring index, angle on ellipse (radians, 0=right, π/2=bottom, π=left, 3π/2=top)
const ORBS = [
  { ring: 0, angle: Math.PI * 1.5, name: 'top' },           // top of vertical ring
  { ring: 2, angle: Math.PI * 0.65, name: 'bottom-left' },  // bottom-left on left-slant
  { ring: 3, angle: Math.PI * 0.35, name: 'bottom-right' }, // bottom-right on right-slant
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

/** SVG path for bold "R" - larger and thicker to match splash.png
 * Scaled up from original to make R more prominent and clearly visible between rings.
 * Path center at (15, 28) for proper centering. */
const R_PATH_STR =
  'M 0 0 L 10 0 C 25 0 32 7 32 17 C 32 25 25 30 10 30 L 10 56 L 0 56 Z M 10 22 L 25 56 L 36 56 L 17 22 Z';
const R_PATH_CENTER_X = 18;
const R_PATH_CENTER_Y = 28;

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
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const center = CENTER * scale;
  const rScale = scale * 0.9; // R is prominent, ~90% of canvas
  
  // Create all 4 ring paths
  const ringPaths = useMemo(
    () => RINGS.map(ring => 
      makeEllipsePath(ring.rx * scale, ring.ry * scale, ring.rot, center)
    ),
    [scale, center]
  );

  // Orb positions - each orbits its assigned ring
  const orb1X = useDerivedValue(() => {
    const angle = ORBS[0].angle + progress.value * 2 * Math.PI;
    const ring = RINGS[ORBS[0].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot, angle, center).x;
  });
  const orb1Y = useDerivedValue(() => {
    const angle = ORBS[0].angle + progress.value * 2 * Math.PI;
    const ring = RINGS[ORBS[0].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot, angle, center).y;
  });
  
  const orb2X = useDerivedValue(() => {
    const angle = ORBS[1].angle + progress.value * 2 * Math.PI;
    const ring = RINGS[ORBS[1].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot, angle, center).x;
  });
  const orb2Y = useDerivedValue(() => {
    const angle = ORBS[1].angle + progress.value * 2 * Math.PI;
    const ring = RINGS[ORBS[1].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot, angle, center).y;
  });
  
  const orb3X = useDerivedValue(() => {
    const angle = ORBS[2].angle + progress.value * 2 * Math.PI;
    const ring = RINGS[ORBS[2].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot, angle, center).x;
  });
  const orb3Y = useDerivedValue(() => {
    const angle = ORBS[2].angle + progress.value * 2 * Math.PI;
    const ring = RINGS[ORBS[2].ring];
    return getPointOnEllipse(ring.rx * scale, ring.ry * scale, ring.rot, angle, center).y;
  });

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group>
        {/* Draw order: rings behind → R in middle → orbs on top */}
        
        {/* 4 elliptical rings forming atom structure with glow */}
        {ringPaths.map((path, i) => (
          <Group key={i}>
            <Path
              path={path}
              color={RING_BLUE}
              style="stroke"
              strokeWidth={2.5 * scale}
            >
              <BlurMask blur={4} style="solid" />
            </Path>
            <Path
              path={path}
              color={RING_BLUE}
              style="stroke"
              strokeWidth={1.5 * scale}
            />
          </Group>
        ))}

        {/* Bold R - clearly visible between rings, no background orb */}
        <Group
          transform={[
            { translateX: -R_PATH_CENTER_X },
            { translateY: -R_PATH_CENTER_Y },
            { scale: rScale },
            { translateX: center },
            { translateY: center },
          ]}
        >
          <Path path={R_PATH_STR} color={R_BLUE}>
            <BlurMask blur={3} style="solid" />
          </Path>
          <Path path={R_PATH_STR} color={R_BLUE} />
        </Group>

        {/* 3 orbiting orbs with glow - top, bottom-left, bottom-right */}
        {[
          { x: orb1X, y: orb1Y, name: 'top' },
          { x: orb2X, y: orb2Y, name: 'bottom-left' },
          { x: orb3X, y: orb3Y, name: 'bottom-right' },
        ].map((orb, i) => (
          <Group key={i}>
            <Circle cx={orb.x} cy={orb.y} r={6 * scale} color={ORB_GLOW}>
              <BlurMask blur={8} style="solid" />
            </Circle>
            <Circle cx={orb.x} cy={orb.y} r={4 * scale} color={ORB_WHITE} />
          </Group>
        ))}
      </Group>
    </Canvas>
  );
}
