/**
 * ProgressRing — Skia-powered circular progress indicator.
 *
 * Rendering approach (no large BlurMask — eliminates the "square glow" artifact
 * caused by BlurMask on wide stroked paths on Android):
 *
 *  1. Muted full-circle track
 *  2. Very-wide, very-low-opacity arc (pure alpha — no blur) for ambient glow
 *  3. Crisp progress arc with round cap
 *  4. Bright animated endcap dot at the arc tip (tiny BlurMask on a small
 *     Circle is fine and looks great without any rectangular artifact)
 *  5. Value text centred via a RN View overlay (avoids complex Skia text)
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, AccessibilityRole } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import {
  Canvas,
  Path,
  Group,
  Circle,
  BlurMask,
  Skia,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';

export type ProgressRingProps = {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0–1
  label: string;
  valueText: string;
  trackColor?: string;
  progressColor?: string;
  accessibilityLabel?: string;
  reduceMotion?: boolean;
};

export function ProgressRing({
  size = 88,
  strokeWidth = 8,
  progress,
  label,
  valueText,
  trackColor,
  progressColor,
  accessibilityLabel,
  reduceMotion = false,
}: ProgressRingProps) {
  const theme  = useTheme();
  const clamped = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;

  const cx = size / 2;
  const cy = size / 2;
  // Inset so the ambient glow layer (1.5 × strokeWidth wide) never clips
  // at the canvas edge.  Formula: canvas_half − strokeWidth/2 − glow_half − 1
  // e.g. size=88, sw=8  →  44 − 4 − 6 − 1 = 33... use simpler (size-sw)/2-6 ≈ 34
  const r = (size - strokeWidth) / 2 - (strokeWidth * 0.75 + 1);

  const accent = progressColor ?? theme.colors.primary;
  const track  = trackColor   ?? theme.colors.surfaceVariant;

  // Full-circle arc path starting at 12 o'clock (–90°), swept 360° clockwise.
  // Both the track and the animated arc share this same path; Skia's `start`/`end`
  // props trim the drawn portion without recomputing the path.
  const circlePath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, -90, 360);
    return path;
  }, [cx, cy, r]);

  const animEnd = useSharedValue(reduceMotion ? clamped : 0);
  useEffect(() => {
    if (reduceMotion) {
      animEnd.value = clamped;
      return;
    }
    animEnd.value = 0;
    animEnd.value = withTiming(clamped, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, animEnd, reduceMotion]);

  // Animated tip-dot position (angle in screen space: 0 = right, grows clockwise).
  const dotX = useDerivedValue(() => {
    const angle = -Math.PI / 2 + animEnd.value * 2 * Math.PI;
    return cx + r * Math.cos(angle);
  });
  const dotY = useDerivedValue(() => {
    const angle = -Math.PI / 2 + animEnd.value * 2 * Math.PI;
    return cy + r * Math.sin(angle);
  });

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
        {/* transparent bg ensures no white square on Android */}
        <Canvas style={{ width: size, height: size, backgroundColor: 'transparent' }}>

          {/* ── Track ────────────────────────────────────────────────────── */}
          <Path
            path={circlePath}
            style="stroke"
            strokeWidth={strokeWidth}
            color={track}
            strokeCap="butt"
          />

          {/* ── Ambient glow: width kept to 1.5 × strokeWidth so the outer
              edge always falls inside the canvas boundary (no clipping).
              Higher opacity than before because the spread is tighter.  */}
          <Group opacity={0.30}>
            <Path
              path={circlePath}
              style="stroke"
              strokeWidth={strokeWidth * 1.5}
              color={accent}
              start={0}
              end={animEnd}
              strokeCap="round"
            />
          </Group>

          {/* ── Crisp progress arc + BlurMask for genuine neon glow ─────────
              BlurMask on a thin (sw=8) path is safe — the square-artifact
              only occurs on very wide stroked paths.                       */}
          <Path
            path={circlePath}
            style="stroke"
            strokeWidth={strokeWidth}
            color={accent}
            start={0}
            end={animEnd}
            strokeCap="round"
          >
            <BlurMask blur={strokeWidth * 0.7} style="solid" />
          </Path>

          {/* ── Animated endcap at arc tip ───────────────────────────────────
              A small Circle with a small BlurMask is safe — only large stroked
              paths produce the square artifact. The outer halo + inner white dot
              give a polished "spotlight" feel without any visual noise. */}
          <Group opacity={0.75}>
            <Circle cx={dotX} cy={dotY} r={strokeWidth * 0.9} color={accent}>
              <BlurMask blur={strokeWidth * 0.55} style="solid" />
            </Circle>
          </Group>
          <Circle cx={dotX} cy={dotY} r={strokeWidth * 0.35} color="#ffffff" />

        </Canvas>

        {/* Value text: standard RN Text absolutely overlaid on the Canvas */}
        <View
          style={[StyleSheet.absoluteFillObject, styles.center]}
          pointerEvents="none"
        >
          <Text
            variant="titleMedium"
            style={{ fontWeight: '800', color: theme.colors.onSurface, letterSpacing: -0.3 }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {valueText}
          </Text>
        </View>
      </View>

      {/* Label below ring */}
      {label ? (
        <Text
          variant="labelSmall"
          style={{
            marginTop: 6,
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            maxWidth: size + 8,
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProgressRing;
