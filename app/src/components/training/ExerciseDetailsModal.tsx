// Exercise Details Modal - Cues, movement diagram, and performance history
import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Modal, Portal, Card, Text, useTheme, ActivityIndicator, IconButton, Divider } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { useQuery } from '@tanstack/react-query';
import { getLastExercisePerformance, getExerciseBestPerformance } from '@/lib/api';
import { estimate1RM } from '@/lib/training/progression';
import type { Exercise, MovementIntent } from '@/lib/training/types';
import { resolveExerciseCues } from '@/lib/training/movementPatternCues';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';
import MovementPatternDiagram from './MovementPatternDiagram';
import { formatWeight, formatWeightReps } from './uiFormat';

interface ExerciseDetailsModalProps {
  visible: boolean;
  exercise: Exercise | null;
  onDismiss: () => void;
  /** When true, hide performance history (preview / in-session guidance). */
  guidanceOnly?: boolean;
}

export default function ExerciseDetailsModal({
  visible,
  exercise,
  onDismiss,
  guidanceOnly = false,
}: ExerciseDetailsModalProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  const performanceQ = useQuery({
    queryKey: ['training:exercise_performance', exercise?.id],
    queryFn: () => (exercise?.id ? getLastExercisePerformance(exercise.id) : null),
    enabled: !!exercise?.id && visible && !guidanceOnly,
  });

  const bestQ = useQuery({
    queryKey: ['training:exercise_best', exercise?.id],
    queryFn: () => (exercise?.id ? getExerciseBestPerformance(exercise.id) : null),
    enabled: !!exercise?.id && visible && !guidanceOnly,
  });

  const cues = useMemo(() => {
    if (!exercise) return [];
    return resolveExerciseCues(exercise.cues, exercise.intents as MovementIntent[]);
  }, [exercise]);

  const subtitle = useMemo(() => {
    if (!exercise?.intents?.length) return '';
    const labels = getPrimaryIntentLabels(exercise.intents as MovementIntent[], 4);
    if (exercise.id === 'pallof_press') {
      return `${labels.join(' • ')} · anti-rotation core`;
    }
    return labels.join(' • ');
  }, [exercise]);

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
          maxHeight: '85%',
        }}
      >
        <View style={{ padding: appTheme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: appTheme.spacing.sm }}>
              <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                {exercise.name}
              </Text>
              {subtitle ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" onPress={onDismiss} accessibilityLabel="Close" />
          </View>

          <MovementPatternDiagram intents={exercise.intents as MovementIntent[]} size={112} />

          <Card mode="outlined" style={{ marginTop: appTheme.spacing.md, marginBottom: appTheme.spacing.lg, borderRadius: appTheme.borderRadius.xl }}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
                How to do it
              </Text>
              {cues.map((line, idx) => (
                <Text key={idx} variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
                  {idx + 1}. {line}
                </Text>
              ))}
            </Card.Content>
          </Card>

          {guidanceOnly ? null : performanceQ.isLoading || bestQ.isLoading ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <ScrollView>
              {bestQ.data ? (
                <Card mode="outlined" style={{ marginBottom: appTheme.spacing.lg, backgroundColor: theme.colors.surfaceVariant, borderRadius: appTheme.borderRadius.xl }}>
                  <Card.Content>
                    <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
                      Best Performance
                    </Text>
                    {bestQ.data.bestWeight ? (
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Best Weight: {formatWeight(bestQ.data.bestWeight)}
                      </Text>
                    ) : null}
                    {bestQ.data.bestReps ? (
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Best Reps: {bestQ.data.bestReps}
                      </Text>
                    ) : null}
                    {bestQ.data.bestE1RM ? (
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Best e1RM: {formatWeight(bestQ.data.bestE1RM)}
                      </Text>
                    ) : null}
                  </Card.Content>
                </Card>
              ) : null}

              {performanceQ.data ? (
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
                        {set.rpe ? (
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            RPE {set.rpe}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                    {e1RMTrend ? (
                      <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: appTheme.spacing.sm }}>
                        Estimated 1RM: {formatWeight(e1RMTrend)}
                      </Text>
                    ) : null}
                  </Card.Content>
                </Card>
              ) : !performanceQ.isLoading ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 16 }}>
                  No performance data yet.
                </Text>
              ) : null}
            </ScrollView>
          )}
          <Divider style={{ opacity: 0 }} />
        </View>
      </Modal>
    </Portal>
  );
}
