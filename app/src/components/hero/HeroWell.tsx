import React from 'react';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';

export interface HeroWellProps {
  children: React.ReactNode;
  kind?: 'chart' | 'meter' | 'chip';
  style?: any;
  contentStyle?: any;
}

/**
 * HeroWell - inset container language for hero visuals (charts, meters, chips).
 * Hero-scoped module (not part of shared UI primitives).
 *
 * IMPORTANT: Keep styling identical to the previous implementation to avoid UI changes.
 */
export function HeroWell({ children, kind = 'chart', style, contentStyle }: HeroWellProps) {
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


