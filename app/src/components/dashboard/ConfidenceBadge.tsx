/**
 * Labelled confidence badge for hero overlays.
 * Replaces the raw debug line ("Low (0%) · 0 days of data") with a proper
 * badge — and says "No data yet" when there is nothing to be confident about.
 */
import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export type ConfidenceBadgeProps = {
  label: string;
  confPct: number;
  trendDaysCount: number;
  hint?: string | null;
};

export function ConfidenceBadge({ label, confPct, trendDaysCount, hint }: ConfidenceBadgeProps) {
  const theme = useTheme();
  const hasData = trendDaysCount > 0;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 18,
          backgroundColor: theme.colors.surfaceVariant,
          opacity: 0.92,
        }}
        accessibilityLabel={
          hasData
            ? `Confidence ${label}, based on ${trendDaysCount} day${trendDaysCount === 1 ? '' : 's'} of data`
            : 'No data yet'
        }
      >
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
          {hasData
            ? `Confidence: ${label} (${confPct}%) · ${trendDaysCount} day${trendDaysCount === 1 ? '' : 's'}`
            : 'No data yet'}
        </Text>
      </View>
      {hint ? (
        <Text
          variant="labelSmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            opacity: 0.75,
            marginTop: 4,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
