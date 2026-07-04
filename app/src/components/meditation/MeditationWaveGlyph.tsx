import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  accent: string;
  width?: number;
  height?: number;
};

/** Tiny decorative waveform for practice cards. */
export function MeditationWaveGlyph({ accent, width = 48, height = 16 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 48 16">
      <Path
        d="M2 8 C6 2, 10 14, 14 8 S22 2, 26 8 34 14, 38 8 42 4, 46 8"
        fill="none"
        stroke={accent}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
