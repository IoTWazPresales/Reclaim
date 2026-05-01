/**
 * Full-page starfield backdrop. Prominent stars, some with faint glow.
 * Renders behind Dashboard content so cards appear to float.
 */

import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

type StarDef = { x: number; y: number; r: number; glow: boolean; opacity: number };

/** Deterministic star positions - scaled by width/height */
function generateStars(width: number, height: number): StarDef[] {
  const stars: StarDef[] = [];
  const seed = 12345;
  const count = 120;
  for (let i = 0; i < count; i++) {
    const s = (seed + i * 7919) % 10000;
    const t = (seed + i * 6781) % 10000;
    const u = (seed + i * 8521) % 10000;
    const x = ((s / 10000) * width);
    const y = ((t / 10000) * height);
    const r = 0.8 + (u / 10000) * 2.2; // 0.8 - 3px
    const glow = (u % 5) < 2; // ~40% glow
    const opacity = 0.35 + (s / 10000) * 0.45; // 0.35 - 0.8
    stars.push({ x, y, r, glow, opacity });
  }
  return stars;
}

type StarfieldFullPageProps = {
  width?: number;
  height: number;
};

export function StarfieldFullPage({ width: propWidth, height }: StarfieldFullPageProps) {
  const { width: screenWidth } = Dimensions.get('window');
  const width = propWidth ?? screenWidth;

  const stars = useMemo(() => generateStars(width, height), [width, height]);

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <RadialGradient id="starGlow">
          <Stop offset="0%" stopColor="rgba(226, 232, 240, 0.9)" />
          <Stop offset="40%" stopColor="rgba(226, 232, 240, 0.3)" />
          <Stop offset="100%" stopColor="rgba(226, 232, 240, 0)" />
        </RadialGradient>
      </Defs>
      {stars.map((s, i) => (
        <React.Fragment key={i}>
          {s.glow ? (
            <>
              <Circle
                cx={s.x}
                cy={s.y}
                r={s.r * 4}
                fill="url(#starGlow)"
                opacity={s.opacity * 0.25}
              />
              <Circle cx={s.x} cy={s.y} r={s.r} fill="rgba(226, 232, 240, 0.85)" opacity={s.opacity} />
            </>
          ) : (
            <Circle cx={s.x} cy={s.y} r={s.r} fill="rgba(226, 232, 240, 0.6)" opacity={s.opacity} />
          )}
        </React.Fragment>
      ))}
    </Svg>
  );
}
