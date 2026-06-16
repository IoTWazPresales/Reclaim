import React from 'react';
import { View, Text } from 'react-native';
import type { MD3Theme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { reclaimUtilityCardSurface } from '@/theme/reclaimVisualLanguage';

export function MedSectionCard({
  title,
  subtitle,
  children,
  theme,
  appTheme,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  theme: MD3Theme;
  appTheme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={{ marginTop: 12, padding: 12, borderRadius: 12, ...reclaimUtilityCardSurface(appTheme, 'quiet') }}>
      <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>{title}</Text>
      {!!subtitle && (
        <Text style={{ marginTop: 4, fontSize: 12, opacity: 0.72, color: theme.colors.onSurfaceVariant }}>{subtitle}</Text>
      )}
      {children}
    </View>
  );
}
