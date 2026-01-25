// Session Detail Modal - View completed session details
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Modal, Portal, Card, Text, Button, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useAppTheme } from '@/theme';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { getExerciseById } from '@/lib/training/engine';
import { getTrainingSession } from '@/lib/api';
import { formatWeight, formatReps, formatWeightReps } from './uiFormat';
import type { TrainingSessionRow, TrainingSessionItemRow } from '@/lib/api';

interface SessionDetailModalProps {
  visible: boolean;
  sessionId: string | null;
  sessionData?: TrainingSessionRow | null; // Optional pre-loaded session data
  onDismiss: () => void;
}

export default function SessionDetailModal({
  visible,
  sessionId,
  sessionData: preloadedSessionData,
  onDismiss,
}: SessionDetailModalProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  // Load session data if not preloaded
  const sessionQuery = useQuery({
    queryKey: ['training:session', sessionId],
    queryFn: () => (sessionId ? getTrainingSession(sessionId) : null),
    enabled: !!sessionId && !preloadedSessionData,
  });

  const sessionData = preloadedSessionData
    ? { session: preloadedSessionData, items: [] }
    : sessionQuery.data;

  if (!visible || !sessionId || !sessionData) return null;

  const { session, items } = sessionData;
  const startDate = session.started_at ? new Date(session.started_at) : null;
  const endDate = session.ended_at ? new Date(session.ended_at) : null;
  const durationMins =
    startDate && endDate ? Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 60000)) : null;

  const summary = typeof session.summary === 'object' ? session.summary : null;
  const exercisesCompleted = summary?.exercisesCompleted ?? summary?.exercises_completed ?? 0;
  const totalSets = summary?.totalSets ?? summary?.total_sets ?? 0;
  const totalVolume = summary?.totalVolume ?? summary?.total_volume ?? null;
  const prs = Array.isArray(summary?.prs) ? summary.prs : [];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          margin: appTheme.spacing.lg,
          borderRadius: appTheme.borderRadius.xl,
          maxHeight: '85%',
        }}
      >
        <View style={{ padding: appTheme.spacing.lg }}>
          <FeatureCardHeader icon="dumbbell" title="Session Details" />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs, marginBottom: appTheme.spacing.md }}>
            {startDate?.toLocaleDateString() || 'Session'}
            {startDate?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              ? ` • ${startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
              : ''}
            {durationMins !== null ? ` • ${durationMins} min` : ''}
          </Text>

          {/* Summary */}
          {summary && (
            <Card mode="outlined" style={{ marginBottom: appTheme.spacing.md, borderRadius: appTheme.borderRadius.lg }}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface, marginBottom: appTheme.spacing.sm }}>
                  Summary
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                  {exercisesCompleted} exercises • {totalSets} sets
                </Text>
                {typeof totalVolume === 'number' && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                    Volume: ~{Math.round(totalVolume)}kg
                  </Text>
                )}
                {prs.length > 0 && (
                  <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: appTheme.spacing.xs, fontWeight: '700' }}>
                    🎉 {prs.length} Personal Record{prs.length > 1 ? 's' : ''}!
                  </Text>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Exercises */}
          <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
            Exercises
          </Text>
          <ScrollView style={{ maxHeight: 400 }}>
            {items && items.length > 0 ? (
              items
                .sort((a, b) => a.order_index - b.order_index)
                .map((item: TrainingSessionItemRow, idx: number) => {
                  const exercise = getExerciseById(item.exercise_id);
                  if (!exercise) return null;

                  const performedSets = item.performed?.sets || [];
                  const plannedSets = item.planned?.sets || [];

                  return (
                    <Card
                      key={item.id}
                      mode="outlined"
                      style={{ marginBottom: appTheme.spacing.sm, borderRadius: appTheme.borderRadius.lg }}
                    >
                      <Card.Content>
                        <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface, marginBottom: appTheme.spacing.xs }}>
                          {idx + 1}. {exercise.name}
                        </Text>
                        {item.skipped ? (
                          <Text variant="bodySmall" style={{ color: theme.colors.error }}>Skipped</Text>
                        ) : performedSets.length > 0 ? (
                          <View style={{ marginTop: appTheme.spacing.xs }}>
                            {performedSets.map((set, setIdx) => (
                              <Text
                                key={setIdx}
                                variant="bodySmall"
                                style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}
                              >
                                Set {set.setIndex}: {formatWeightReps(set.weight, set.reps)}
                                {set.rpe ? ` @ RPE ${set.rpe}` : ''}
                              </Text>
                            ))}
                          </View>
                        ) : (
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Planned: {plannedSets.length} sets (not performed)
                          </Text>
                        )}
                      </Card.Content>
                    </Card>
                  );
                })
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                No exercises recorded
              </Text>
            )}
          </ScrollView>

          <Button mode="contained" onPress={onDismiss} style={{ marginTop: appTheme.spacing.lg }}>
            Close
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}
