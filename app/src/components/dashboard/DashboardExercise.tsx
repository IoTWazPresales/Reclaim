import React from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { getSessionTemplateLabel } from '@/lib/training/sessionLabels';

export type DashboardExerciseProps = {
  inProgressSession: unknown;
  completedSessionToday: unknown;
  todayProgramDay: { template_key?: string } | null;
  hasActiveProgram: boolean;
  onNavigateToTraining: () => void;
};

export function DashboardExercise({
  inProgressSession,
  completedSessionToday,
  todayProgramDay,
  hasActiveProgram,
  onNavigateToTraining,
}: DashboardExerciseProps) {
  const theme = useTheme();

  return (
    <InformationalCard feedbackScope={{ componentKey: 'dashboard-exercise', componentTitle: 'Exercise', tags: ['dashboard'] }}>
      <FeatureCardHeader icon="dumbbell" title="Exercise" subtitle="Today's session." />
      {inProgressSession ? (
        <View style={{ marginTop: 10 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            Session in progress
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
            Pick up where you left off.
          </Text>
          <Button mode="contained" onPress={onNavigateToTraining}>
            Resume workout
          </Button>
        </View>
      ) : completedSessionToday ? (
        <View style={{ marginTop: 10 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            Completed
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 8 }}>
            Nice work today.
          </Text>
          <Button mode="outlined" onPress={onNavigateToTraining}>
            View program
          </Button>
        </View>
      ) : todayProgramDay ? (
        <View style={{ marginTop: 10 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            Planned
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
            {getSessionTemplateLabel(todayProgramDay?.template_key ?? 'full_body')} workout
          </Text>
          <Button mode="contained" onPress={onNavigateToTraining}>
            Start workout
          </Button>
        </View>
      ) : hasActiveProgram ? (
        <View style={{ marginTop: 10 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            Rest day
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 8 }}>
            No workout planned for today.
          </Text>
          <Button mode="outlined" onPress={onNavigateToTraining}>
            View program
          </Button>
        </View>
      ) : (
        <View style={{ marginTop: 10 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Set up your program to get personalized workouts.
          </Text>
          <Button mode="contained" onPress={onNavigateToTraining}>
            Get started
          </Button>
        </View>
      )}
    </InformationalCard>
  );
}
