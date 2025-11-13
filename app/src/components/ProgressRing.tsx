import React from 'react';
import { View, AccessibilityRole } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';

type ProgressRingProps = {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 - 1
  label: string;
  valueText: string;
  trackColor?: string;
  progressColor?: string;
  accessibilityLabel?: string;
};

export function ProgressRing({
  size = 88,
  strokeWidth = 10,
  progress,
  label,
  valueText,
  trackColor,
  progressColor,
  accessibilityLabel,
}: ProgressRingProps) {
  const theme = useTheme();

  const clampedProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedProgress);

  const track = trackColor ?? theme.colors.surfaceVariant;
  const indicator = progressColor ?? theme.colors.primary;

  const a11yLabel =
    accessibilityLabel ??
    `${label}: ${valueText}, ${Math.round(clampedProgress * 100)} percent complete`;

  return (
    <View
      accessibilityRole={'image' as AccessibilityRole}
      accessibilityLabel={a11yLabel}
      style={{ alignItems: 'center' }}
    >
      <Svg width={size} height={size}>
        <Circle
          stroke={track}
          fill="transparent"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeLinecap="round"
        />
        <Circle
          stroke={indicator}
          fill="transparent"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text variant="headlineSmall" style={{ marginTop: 8 }}>
        {valueText}
      </Text>
      <Text variant="labelMedium" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

export default ProgressRing;


