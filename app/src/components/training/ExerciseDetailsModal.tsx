// Exercise Details Modal - Shows performance history and trends
import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Modal, Portal, Card, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { useQuery } from '@tanstack/react-query';
import { getLastExercisePerformance, getExerciseBestPerformance } from '@/lib/api';
import { estimate1RM } from '@/lib/training/progression';
import type { Exercise, MovementIntent } from '@/lib/training/types';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';
import { formatWeight, formatWeightReps } from './uiFormat';

interface ExerciseDetailsModalProps {
  visible: boolean;
  exercise: Exercise | null;
  onDismiss: () => void;
}

export default function ExerciseDetailsModal({ visible, exercise, onDismiss }: ExerciseDetailsModalProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  const performanceQ = useQuery({
    queryKey: ['training:exercise_performance', exercise?.id],
    queryFn: () => (exercise?.id ? getLastExercisePerformance(exercise.id) : null),
    enabled: !!exercise?.id && visible,
  });

  const bestQ = useQuery({
    queryKey: ['training:exercise_best', exercise?.id],
    queryFn: () => (exercise?.id ? getExerciseBestPerformance(exercise.id) : null),
    enabled: !!exercise?.id && visible,
  });

  // Compute e1RM trend from last 3 sessions (simplified - would need to fetch multiple sessions)
  const e1RMTrend = useMemo(() => {
    if (!performanceQ.data?.sets || performanceQ.data.sets.length === 0) return null;
    const bestSet = performanceQ.data.sets.reduce((best, set) => {
      const bestE1rm = estimate1RM(best.weight, best.reps);
      const setE1rm = estimate1RM(set.weight, set.reps);
      return setE1rm > bestE1rm ? set : best;
    }, performanceQ.data.sets[0]);
    return estimate1RM(bestSet.weight, bestSet.reps);
  }, [performanceQ.data]);

  if (!exercise) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          margin: appTheme.spacing.xl,
          borderRadius: appTheme.borderRadius.xl,
          maxHeight: '80%',
        }}
      >
        <View style={{ padding: appTheme.spacing.lg }}>
          <Text variant="headlineSmall" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
            {exercise.name}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.lg }} numberOfLines={2}>
            {exercise.intents && exercise.intents.length > 0
              ? getPrimaryIntentLabels(exercise.intents as MovementIntent[], 4).join(' • ')
              : ''}
          </Text>

          {performanceQ.isLoading || bestQ.isLoading ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <ScrollView>
              {/* Best Performance */}
              {bestQ.data && (
                <Card mode="outlined" style={{ marginBottom: appTheme.spacing.lg, backgroundColor: theme.colors.surfaceVariant, borderRadius: appTheme.borderRadius.xl }}>
                  <Card.Content>
                    <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
                      Best Performance
                    </Text>
                    {bestQ.data.bestWeight && (
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Best Weight: {formatWeight(bestQ.data.bestWeight)}
                      </Text>
                    )}
                    {bestQ.data.bestReps && (
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Best Reps: {bestQ.data.bestReps}
                      </Text>
                    )}
                    {bestQ.data.bestE1RM && (
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Best e1RM: {formatWeight(bestQ.data.bestE1RM)}
                      </Text>
                    )}
                    {bestQ.data.bestVolume && (
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Best Volume: {formatWeight(bestQ.data.bestVolume)}
                      </Text>
                    )}
                  </Card.Content>
                </Card>
              )}

              {/* Last Performance */}
              {performanceQ.data && (
                <Card mode="outlined" style={{ marginBottom: appTheme.spacing.lg, borderRadius: appTheme.borderRadius.xl }}>
                  <Card.Content>
                    <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
                      Last Session
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.sm }}>
                      {new Date(performanceQ.data.date).toLocaleDateString()}
                    </Text>
                    {performanceQ.data.sets.map((set, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingVertical: 4,
                          borderBottomWidth: idx < performanceQ.data!.sets.length - 1 ? 1 : 0,
                          borderBottomColor: theme.colors.outline,
                        }}
                      >
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                          Set {set.setIndex}: {formatWeightReps(set.weight, set.reps)}
                        </Text>
                        {set.rpe && (
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            RPE {set.rpe}
                          </Text>
                        )}
                      </View>
                    ))}
                    {e1RMTrend && (
                      <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: appTheme.spacing.sm }}>
                        Estimated 1RM: {formatWeight(e1RMTrend)}
                      </Text>
                    )}
                  </Card.Content>
                </Card>
              )}

              {!performanceQ.data && !performanceQ.isLoading && (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 24 }}>
                  No performance data yet. Complete a session with this exercise to see history.
                </Text>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </Portal>
  );
}
