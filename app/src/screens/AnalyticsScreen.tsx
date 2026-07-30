/**
 * Analytics tab — gated until user base supports meaningful comparisons.
 * Shows a frosted “Coming soon” overlay over muted placeholder cards (not live data).
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { AppScreen, AppCard } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { reclaimUtilityCardSurface } from '@/theme/reclaimVisualLanguage';

function PlaceholderCard({
  title,
  lines,
  surface,
}: {
  title: string;
  lines: number;
  surface: object;
}) {
  const theme = useTheme();
  return (
    <AppCard style={surface} marginBottom={0}>
      <Card.Content>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {title}
        </Text>
        {Array.from({ length: lines }).map((_, i) => (
          <View
            key={`${title}-${i}`}
            style={{
              marginTop: i === 0 ? 12 : 8,
              height: 10,
              borderRadius: 6,
              width: `${70 - i * 12}%`,
              backgroundColor: theme.colors.surfaceVariant,
            }}
          />
        ))}
      </Card.Content>
    </AppCard>
  );
}

export default function AnalyticsScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme), [appTheme]);

  return (
    <AppScreen>
      <View style={{ flex: 1, minHeight: 480 }}>
        <View pointerEvents="none" style={{ opacity: 0.42, gap: appTheme.spacing.md, paddingBottom: 24 }}>
          <PlaceholderCard title="Mood trends" lines={3} surface={utilitySurface} />
          <PlaceholderCard title="Meditation rhythm" lines={2} surface={utilitySurface} />
          <PlaceholderCard title="How you compare" lines={4} surface={utilitySurface} />
          <PlaceholderCard title="Mood ↔ meditation" lines={3} surface={utilitySurface} />
        </View>

        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 28,
              backgroundColor: theme.dark
                ? 'rgba(10, 14, 22, 0.72)'
                : 'rgba(248, 249, 251, 0.78)',
            },
          ]}
          accessibilityRole="summary"
          accessibilityLabel="Analytics coming soon"
        >
          <View
            style={{
              maxWidth: 360,
              width: '100%',
              borderRadius: 20,
              paddingVertical: 28,
              paddingHorizontal: 22,
              backgroundColor: theme.colors.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <Text
              variant="headlineSmall"
              style={{ fontWeight: '700', color: theme.colors.onSurface, textAlign: 'center' }}
            >
              Coming soon
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                marginTop: 12,
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              Deeper analytics and comparisons will open once there is enough community signal to make
              them meaningful. Your mood, sleep, training, and meds still power Home insights today.
            </Text>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}
