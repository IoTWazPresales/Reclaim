import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';

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
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          borderRadius: appTheme.borderRadius.lg,
          padding,
        },
        style,
      ]}
    >
      <View style={contentStyle}>{children}</View>
    </View>
  );
}


