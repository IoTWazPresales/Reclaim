import React from 'react';
import { Animated, Easing, View, type ViewProps } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export interface HeroWellProps {
  children: React.ReactNode;
  kind?: 'chart' | 'meter' | 'chip';
  style?: any;
  contentStyle?: any;
  pointerEvents?: ViewProps['pointerEvents'];
  /**
   * Ultra-subtle ambient gradient drift behind the primary hero focus area.
   * Keep false by default; intended for a single primary HeroWell only.
   */
  ambientDrift?: boolean;
  /**
   * Ambient drift loop duration in ms (clamped to [8000, 60000]).
   * Recommended:
   * - Sleep: omit (default drift)
   * - Mood: omit (default drift) + atmosphere
   * - Meds: ~20000 (quiet drift)
   */
  driftDurationMs?: number;
  /**
   * Overall drifting overlay opacity (clamped to [0, 0.06]).
   * Recommended:
   * - Sleep: omit (default)
   * - Mood: omit (default) + atmosphere
   * - Meds: ~0.03 (quiet)
   */
  driftOpacity?: number;
  /**
   * When true, renders a calm "atmosphere" (orb-like) layer using neutral overlays.
   * This does not change any theme palette; it only uses white overlays with very low opacity.
   */
  atmosphere?: boolean;
}

/**
 * HeroWell - inset container language for hero visuals (charts, meters, chips).
 * Hero-scoped module (not part of shared UI primitives).
 *
 * IMPORTANT: Keep styling identical to the previous implementation to avoid UI changes.
 */
export function HeroWell({
  children,
  kind = 'chart',
  style,
  contentStyle,
  pointerEvents,
  ambientDrift = false,
  driftDurationMs = 16000,
  driftOpacity = 0.05,
  atmosphere = false,
}: HeroWellProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();

  // Safeguards (intended to be no-ops for current usage):
  // - Clamp opacity to a safe, non-distracting range.
  // - Clamp duration to avoid accidental extreme loops.
  // - Centralize reduced-motion gating so drift/atmosphere cannot run when reduced motion is enabled.
  const safeOpacity = Math.max(0, Math.min(0.06, driftOpacity));
  const safeDuration = Math.max(8000, Math.min(60000, driftDurationMs));
  const driftEnabled = ambientDrift && !reduceMotion;

  // Ambient drift: extremely subtle, slow, and only when enabled for the primary focus well.
  const drift = React.useRef(new Animated.Value(0)).current;
  const drift2 = React.useRef(new Animated.Value(0)).current;
  const gradId = React.useMemo(() => `well-grad-${Math.random().toString(36).slice(2)}`, []);
  const orbId = React.useMemo(() => `well-orb-${Math.random().toString(36).slice(2)}`, []);

  React.useEffect(() => {
    if (!driftEnabled) {
      drift.stopAnimation();
      drift2.stopAnimation();
      drift.setValue(0);
      drift2.setValue(0);
      return;
    }

    const duration = safeDuration; // clamped
    const ease = Easing.inOut(Easing.sin);

    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(drift, { toValue: 1, duration: duration / 2, easing: ease, useNativeDriver: true }),
          Animated.timing(drift2, { toValue: 1, duration: duration / 2, easing: ease, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(drift, { toValue: 0, duration: duration / 2, easing: ease, useNativeDriver: true }),
          Animated.timing(drift2, { toValue: 0, duration: duration / 2, easing: ease, useNativeDriver: true }),
        ]),
      ]),
    );

    anim.start();
    return () => anim.stop();
  }, [driftEnabled, safeDuration, drift, drift2]);

  const padding =
    kind === 'chip'
      ? appTheme.spacing.sm
      : kind === 'meter'
        ? appTheme.spacing.md
        : appTheme.spacing.md;

  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        {
          position: 'relative',
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          borderRadius: appTheme.borderRadius.lg,
          padding,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Ambient drift overlay (behind content). Intentionally neutral white and extremely subtle. */}
      {driftEnabled ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -14,
            left: -14,
            right: -14,
            bottom: -14,
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 10],
                }),
              },
              {
                translateY: drift2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, -8],
                }),
              },
            ],
            opacity: safeOpacity, // clamped to [0, 0.06]
          }}
        >
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="rgba(255,255,255,1)" stopOpacity={0.06} />
                <Stop offset="1" stopColor="rgba(255,255,255,1)" stopOpacity={0.0} />
              </LinearGradient>
              {atmosphere ? (
                <RadialGradient id={orbId} cx="35%" cy="40%" rx="55%" ry="55%">
                  <Stop offset="0" stopColor="rgba(255,255,255,1)" stopOpacity={0.05} />
                  <Stop offset="1" stopColor="rgba(255,255,255,1)" stopOpacity={0.0} />
                </RadialGradient>
              ) : null}
            </Defs>
            {atmosphere ? <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${orbId})`} /> : null}
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradId})`} />
          </Svg>
        </Animated.View>
      ) : null}

      {/* inner top highlight */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
      />
      <View style={contentStyle}>{children}</View>
    </View>
  );
}


