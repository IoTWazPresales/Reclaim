import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { MoodWeatherKind } from '@/lib/mood/moodWeather';

type Props = {
  kind: MoodWeatherKind;
  accent: string;
  muted?: string;
  size?: number;
};

/** Stroke-drawn weather glyph — no emoji. */
export function MoodWeatherGlyph({ kind, accent, muted = 'rgba(148,163,184,0.55)', size = 22 }: Props) {
  const stroke = accent;
  const sw = 1.6;

  if (kind === 'clear') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="5" fill="none" stroke={stroke} strokeWidth={sw} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 12 + Math.cos(rad) * 7;
          const y1 = 12 + Math.sin(rad) * 7;
          const x2 = 12 + Math.cos(rad) * 9.5;
          const y2 = 12 + Math.sin(rad) * 9.5;
          return <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
        })}
      </Svg>
    );
  }

  if (kind === 'cloudy') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M7 16h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.2A3.5 3.5 0 0 0 7 16z"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (kind === 'heavy') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M6 14h12a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 7.2 8.2 3 3 0 0 0 6 14z"
          fill="none"
          stroke={muted}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <Line x1="9" y1="17" x2="9" y2="19" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <Line x1="12" y1="17" x2="12" y2="20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <Line x1="15" y1="17" x2="15" y2="19" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </Svg>
    );
  }

  // storm / turbulent
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 13h11a3 3 0 0 0 .2-6 4.5 4.5 0 0 0-8.6 1A2.5 2.5 0 0 0 5 13z"
        fill="none"
        stroke={muted}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <Path d="M11 15l-2 4h3l-2 4" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
