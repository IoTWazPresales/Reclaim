// Progression Graph - Show e1RM trend for an exercise
import React from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import type { LastPerformance } from '@/lib/training/types';
import { estimate1RM } from '@/lib/training/progression';

interface ProgressionGraphProps {
  exerciseName: string;
  performances: LastPerformance[];
}

export default function ProgressionGraph({ exerciseName, performances }: ProgressionGraphProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  if (performances.length === 0) {
    return (
      <Card mode="outlined" style={{ marginBottom: appTheme.spacing.md }}>
        <Card.Content>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            No performance history available
          </Text>
        </Card.Content>
      </Card>
    );
  }

  // Calculate e1RM for each performance
  const e1RMs = performances.map((p) => estimate1RM(p.weight, p.reps)).reverse();
  const maxE1RM = Math.max(...e1RMs);
  const minE1RM = Math.min(...e1RMs);
  const range = maxE1RM - minE1RM || 1;

  return (
    <Card mode="outlined" style={{ marginBottom: appTheme.spacing.md }}>
      <Card.Content>
        <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
          {exerciseName} Progression
        </Text>
        <View style={{ height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          {e1RMs.map((e1rm, index) => {
            const height = ((e1rm - minE1RM) / range) * 80 + 20;
            return (
              <View
                key={index}
                style={{
                  flex: 1,
                  height,
                  backgroundColor: theme.colors.primary,
                  borderRadius: 2,
                }}
              />
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: appTheme.spacing.sm }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {performances.length} sessions
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
            e1RM: {e1RMs[e1RMs.length - 1].toFixed(1)}kg
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}
