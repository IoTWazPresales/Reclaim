import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, AccessibilityRole } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import {
  Canvas,
  Path,
  Group,
  BlurMask,
  Skia,
} from '@shopify/react-native-skia';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';

type ProgressRingProps = {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0–1
  label: string;
  valueText: string;
  trackColor?: string;
  progressColor?: string;
  accessibilityLabel?: string;
};

export function ProgressRing({
  size = 88,
  strokeWidth = 9,
  progress,
  label,
  valueText,
  trackColor,
  progressColor,
  accessibilityLabel,
}: ProgressRingProps) {
  const theme = useTheme();
  const clamped = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;

  const cx = size / 2;
  const cy = size / 2;
  // Inset the radius so the glow BlurMask doesn't clip at the canvas edge
  const r = (size - strokeWidth) / 2 - 2;

  const accent = progressColor ?? theme.colors.primary;
  const track  = trackColor   ?? theme.colors.surfaceVariant;

  // Static full-circle path starting at 12 o'clock, swept clockwise.
  // Re-computed only when the geometry changes, not on every render.
  const circlePath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, -90, 360);
    return path;
  }, [cx, cy, r]);

  // Animate from 0 → clamped progress on mount / whenever progress changes.
  const animEnd = useSharedValue(0);
  useEffect(() => {
    animEnd.value = withTiming(clamped, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, animEnd]);

  const a11y =
    accessibilityLabel ??
    `${label}: ${valueText}, ${Math.round(clamped * 100)} percent complete`;

  return (
    <View
      accessibilityRole={'image' as AccessibilityRole}
      accessibilityLabel={a11y}
      style={{ alignItems: 'center' }}
    >
      <View style={{ width: size, height: size }}>
        <Canvas style={{ width: size, height: size }}>

          {/* Track ring — full circle, muted colour */}
          <Path
            path={circlePath}
            style="stroke"
            strokeWidth={strokeWidth}
            color={track}
            strokeCap="round"
          />

          {/* Glow layer — wider, blurred, semi-transparent arc */}
          <Group opacity={0.45}>
            <Path
              path={circlePath}
              style="stroke"
              strokeWidth={strokeWidth * 2.4}
              color={accent}
              start={0}
              end={animEnd}
              strokeCap="round"
            >
              <BlurMask blur={strokeWidth * 0.9} style="solid" />
            </Path>
          </Group>

          {/* Crisp progress arc — sits on top of the glow */}
          <Path
            path={circlePath}
            style="stroke"
            strokeWidth={strokeWidth}
            color={accent}
            start={0}
            end={animEnd}
            strokeCap="round"
          />

        </Canvas>

        {/* Center value text — absolutely overlaid on the Canvas */}
        <View
          style={[StyleSheet.absoluteFillObject, styles.centerOverlay]}
          pointerEvents="none"
        >
          <Text
            variant="titleMedium"
            style={{ fontWeight: '800', color: theme.colors.onSurface }}
            numberOfLines={1}
          >
            {valueText}
          </Text>
        </View>
      </View>

      {/* Label below */}
      <Text
        variant="labelSmall"
        style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, textAlign: 'center', maxWidth: size + 8 }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProgressRing;
