// Full Session Panel - View all exercises in session order
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, Card, useTheme, Chip } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { getExerciseById } from '@/lib/training/engine';
import type { PlannedExercise, MovementIntent } from '@/lib/training/types';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';

interface FullSessionPanelProps {
  visible: boolean;
  exercises: PlannedExercise[];
  currentExerciseIndex: number;
  sessionLabel?: string;
  onClose: () => void;
}

export default function FullSessionPanel({
  visible,
  exercises,
  currentExerciseIndex,
  sessionLabel,
  onClose,
}: FullSessionPanelProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          margin: appTheme.spacing.lg,
          borderRadius: appTheme.borderRadius.xl,
          maxHeight: '85%',
        }}
      >
        <View style={{ padding: appTheme.spacing.lg }}>
          <FeatureCardHeader icon="format-list-numbered" title="Full Session" />
          {sessionLabel && (
            <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginTop: appTheme.spacing.xs, marginBottom: appTheme.spacing.md, fontWeight: '600' }}>
              {sessionLabel}
            </Text>
          )}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.lg }}>
            View-only: see what's next and plan ahead
          </Text>

          <ScrollView style={{ maxHeight: 450 }}>
            {exercises.map((ex, index) => {
              const exercise = getExerciseById(ex.exerciseId);
              if (!exercise) return null;

              const isCurrent = index === currentExerciseIndex;
              const isPast = index < currentExerciseIndex;

              return (
                <Card
                  key={ex.exerciseId}
                  mode={isCurrent ? 'elevated' : 'outlined'}
                  style={{
                    marginBottom: appTheme.spacing.sm,
                    backgroundColor: isCurrent ? theme.colors.primaryContainer : theme.colors.surface,
                    opacity: isPast ? 0.6 : 1,
                    borderRadius: appTheme.borderRadius.lg,
                  }}
                >
                  <Card.Content style={{ padding: appTheme.spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: appTheme.spacing.xs }}>
                          <Text variant="bodySmall" style={{ color: isCurrent ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, marginRight: appTheme.spacing.xs }}>
                            #{index + 1}
                          </Text>
                          {isCurrent && (
                            <Chip
                              compact
                              mode="flat"
                              textStyle={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: theme.colors.onPrimary,
                              }}
                              style={{
                                backgroundColor: theme.colors.primary,
                              }}
                            >
                              CURRENT
                            </Chip>
                          )}
                          {isPast && (
                            <Chip
                              compact
                              mode="outlined"
                              textStyle={{
                                fontSize: 10,
                                fontWeight: '500',
                                color: theme.colors.onSurfaceVariant,
                              }}
                              style={{
                                backgroundColor: 'transparent',
                                borderColor: theme.colors.outline,
                              }}
                            >
                              Done
                            </Chip>
                          )}
                        </View>
                        <Text variant="bodyLarge" style={{ fontWeight: '700', color: isCurrent ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
                          {exercise.name}
                        </Text>
                        <Text variant="bodySmall" style={{ color: isCurrent ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                          {ex.plannedSets.length} sets
                          {ex.intents && ex.intents.length > 0
                            ? ` • ${getPrimaryIntentLabels(ex.intents as MovementIntent[], 2).join(', ')}`
                            : ''}
                        </Text>
                        <Text variant="bodySmall" style={{ color: isCurrent ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                          {ex.plannedSets[0]?.targetReps} reps @ {ex.plannedSets[0]?.suggestedWeight}kg
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </ScrollView>

          <Button mode="contained" onPress={onClose} style={{ marginTop: appTheme.spacing.lg }}>
            Back to workout
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}
