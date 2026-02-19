import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { ProgressRing } from '@/components/ProgressRing';
import { sleepConsistencyText, medsOnTrackText } from '@/lib/dashboard/utils';

export type ProgressMetric = {
  key: string;
  progress: number;
  valueText: string;
  label: string;
  accessibilityLabel: string;
};

export type DashboardProgressProps = {
  metrics: ProgressMetric[];
  sleepMidpointStd: number | null;
  medAdherencePct: number | null;
};

// Per-metric accent colours, keyed by metric.key.
// Fallback to theme.colors.primary for unknown keys.
function accentForKey(key: string, theme: ReturnType<typeof useTheme>): string {
  switch (key) {
    case 'mood':  return theme.colors.primary;
    case 'sleep': return theme.colors.secondary;
    case 'meds':  return (theme.colors as any).tertiary ?? '#00897b';
    default:      return theme.colors.primary;
  }
}

export function DashboardProgress({ metrics, sleepMidpointStd, medAdherencePct }: DashboardProgressProps) {
  const theme = useTheme();

  if (metrics.length === 0) {
    return (
      <InformationalCard feedbackScope={{ componentKey: 'dashboard-progress-empty', componentTitle: 'Your progress', tags: ['dashboard'] }}>
        <FeatureCardHeader icon="chart-donut" title="Your progress" subtitle="Tiny wins. Real momentum." />
        <Text style={{ marginTop: 10, color: theme.colors.onSurfaceVariant }}>
          Log your mood, sleep, and meds to start building your weekly progress rings here.
        </Text>
      </InformationalCard>
    );
  }

  return (
    <InformationalCard feedbackScope={{ componentKey: 'dashboard-progress', componentTitle: 'Your progress', tags: ['dashboard'] }}>
      <FeatureCardHeader icon="chart-donut" title="Your progress" subtitle="Tiny wins. Real momentum." />

      {/* Ring row — evenly spread so the three rings breathe */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'flex-start',
          marginTop: 18,
          marginBottom: 4,
          paddingHorizontal: 4,
        }}
      >
        {metrics.map((metric) => (
          <ProgressRing
            key={metric.key}
            size={88}
            strokeWidth={8}
            progress={metric.progress}
            valueText={metric.valueText}
            label={metric.label}
            progressColor={accentForKey(metric.key, theme)}
            accessibilityLabel={metric.accessibilityLabel}
          />
        ))}
      </View>

      {/* Contextual sub-text */}
      {sleepMidpointStd !== null ? (
        <Text style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          Sleep consistency: {sleepConsistencyText(sleepMidpointStd).helper}.
        </Text>
      ) : null}

      {medAdherencePct !== null ? (
        <Text style={{ marginTop: 2, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          Meds: {medsOnTrackText(medAdherencePct).helper}.
        </Text>
      ) : null}
    </InformationalCard>
  );
}
