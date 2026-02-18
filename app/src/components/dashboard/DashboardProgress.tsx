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

export function DashboardProgress({ metrics, sleepMidpointStd, medAdherencePct }: DashboardProgressProps) {
  const theme = useTheme();

  if (metrics.length === 0) return null;

  return (
    <InformationalCard feedbackScope={{ componentKey: 'dashboard-progress', componentTitle: 'Your progress', tags: ['dashboard'] }}>
      <FeatureCardHeader icon="chart-donut" title="Your progress" subtitle="Tiny wins. Real momentum." />

      <Text style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
        Keep it simple today — you're building consistency, not perfection.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
        {metrics.map((metric) => (
          <View key={metric.key} style={{ width: '32%', minWidth: 100, marginBottom: 16, alignItems: 'center' }}>
            <ProgressRing
              progress={metric.progress}
              valueText={metric.valueText}
              label={metric.label}
              accessibilityLabel={metric.accessibilityLabel}
            />
          </View>
        ))}
      </View>

      {sleepMidpointStd !== null ? (
        <Text style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
          Sleep consistency: {sleepConsistencyText(sleepMidpointStd).helper}.
        </Text>
      ) : null}

      {medAdherencePct !== null ? (
        <Text style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
          Meds: {medsOnTrackText(medAdherencePct).helper}.
        </Text>
      ) : null}
    </InformationalCard>
  );
}
