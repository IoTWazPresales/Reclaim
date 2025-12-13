import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from 'react-native-paper';

type Props = {
  durations: number[]; // minutes, ordered newest-first or oldest-first (we normalize)
  width?: number;
  height?: number;
};

export function SleepDurationSparkline({ durations, width = 220, height = 60 }: Props) {
  const theme = useTheme();

  const pathData = useMemo(() => {
    if (!durations || durations.length === 0) return null;
    const points = [...durations].slice(-14); // cap at 14 points
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = Math.max(1, max - min);

    const step = points.length > 1 ? width / (points.length - 1) : width;
    const coords = points.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return { x, y };
    });
    const path = coords
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');
    return { path, coords };
  }, [durations, height, width]);

  if (!pathData) {
    return <Text style={{ color: theme.colors.onSurfaceVariant }}>No data</Text>;
  }

  return (
    <View>
      <Svg width={width} height={height}>
        <Path
          d={pathData.path}
          fill="none"
          stroke={theme.colors.primary}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>
        Last {Math.min(durations.length, 14)} sleeps
      </Text>
    </View>
  );
}


