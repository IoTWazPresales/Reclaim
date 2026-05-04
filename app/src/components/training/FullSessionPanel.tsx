import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Modal, Portal, Text, Button, Card, useTheme, Chip } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import {
  reclaimUtilityCardSurface,
  reclaimRecessedWell,
  reclaimPrimaryCapsuleButton,
} from '@/theme/reclaimVisualLanguage';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { getExerciseById } from '@/lib/training/engine';
import { formatExercisePreviewLine } from '@/lib/training/loadDisplayFormat';
import type { PlannedExercise, MovementIntent } from '@/lib/training/types';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';

export interface ExerciseCompletionStatus {
  exerciseId: string;
  completedSets: number;
  totalSets: number;
  skipped: boolean;
}

interface FullSessionPanelProps {
  visible: boolean;
  exercises: PlannedExercise[];
  currentExerciseIndex: number;
  sessionLabel?: string;
  completionStatuses?: ExerciseCompletionStatus[];
  onGoToExercise?: (index: number) => void;
  onClose: () => void;
}

export default function FullSessionPanel({
  visible,
  exercises,
  currentExerciseIndex,
  sessionLabel,
  completionStatuses,
  onGoToExercise,
  onClose,
}: FullSessionPanelProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const cardSurface = useMemo(() => reclaimUtilityCardSurface(appTheme, 'journey'), [appTheme]);
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          cardSurface as any,
          {
            margin: appTheme.spacing.lg,
            borderRadius: appTheme.borderRadius.xl,
            maxHeight: '85%',
          },
        ]}
      >
        <View style={{ padding: appTheme.spacing.lg }}>
          <FeatureCardHeader icon="format-list-numbered" title="Full Session" />
          {sessionLabel && (
            <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginTop: appTheme.spacing.xs, marginBottom: appTheme.spacing.md, fontWeight: '600' }}>
              {sessionLabel}
            </Text>
          )}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.lg }}>
            Tap an exercise to jump to it
          </Text>

          <ScrollView style={{ maxHeight: 450 }}>
            {exercises.map((ex, index) => {
              const exercise = getExerciseById(ex.exerciseId);
              if (!exercise) return null;

              const isCurrent = index === currentExerciseIndex;
              const status = completionStatuses?.find((s) => s.exerciseId === ex.exerciseId);
              const isFullyDone = status
                ? status.completedSets >= status.totalSets
                : index < currentExerciseIndex;
              const isSkipped = status?.skipped ?? false;
              const setsInfo = status
                ? `${status.completedSets}/${status.totalSets} sets done`
                : `${ex.plannedSets.length} sets`;

              const wellBase = reclaimRecessedWell(appTheme) as any;
              const cardContent = (
                <View
                  style={[
                    wellBase,
                    {
                      marginBottom: appTheme.spacing.sm,
                      opacity: isSkipped ? 0.5 : 1,
                    },
                    isCurrent && {
                      backgroundColor: appTheme.dark ? 'rgba(37,99,235,0.14)' : 'rgba(37,99,235,0.08)',
                      borderColor: appTheme.dark ? 'rgba(96,165,250,0.3)' : 'rgba(37,99,235,0.18)',
                    },
                  ]}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: appTheme.spacing.xs, gap: 6 }}>
                          <Text variant="bodySmall" style={{ color: isCurrent ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }}>
                            #{index + 1}
                          </Text>
                          {isCurrent && (
                            <Chip
                              compact
                              mode="flat"
                              textStyle={{ fontSize: 10, fontWeight: '700', color: theme.colors.onPrimary }}
                              style={{ backgroundColor: theme.colors.primary }}
                            >
                              CURRENT
                            </Chip>
                          )}
                          {isFullyDone && !isCurrent && (
                            <Chip
                              compact
                              mode="flat"
                              textStyle={{ fontSize: 10, fontWeight: '600', color: theme.colors.onTertiary }}
                              style={{ backgroundColor: theme.colors.tertiary }}
                            >
                              DONE
                            </Chip>
                          )}
                          {isSkipped && (
                            <Chip
                              compact
                              mode="flat"
                              textStyle={{ fontSize: 10, fontWeight: '500', color: theme.colors.onError }}
                              style={{ backgroundColor: theme.colors.error }}
                            >
                              SKIPPED
                            </Chip>
                          )}
                        </View>
                        <Text variant="bodyLarge" style={{ fontWeight: '700', color: isCurrent ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
                          {exercise.name}
                        </Text>
                        <Text variant="bodySmall" style={{ color: isCurrent ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                          {setsInfo}
                          {ex.intents && ex.intents.length > 0
                            ? ` · ${getPrimaryIntentLabels(ex.intents as MovementIntent[], 2).join(', ')}`
                            : ''}
                        </Text>
                <Text variant="bodySmall" style={{ color: isCurrent ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                  {formatExercisePreviewLine(ex, exercise)}
                </Text>
                      </View>
                    </View>
                </View>
              );

              if (onGoToExercise) {
                return (
                  <Pressable
                    key={ex.exerciseId}
                    onPress={() => {
                      onGoToExercise(index);
                      onClose();
                    }}
                  >
                    {cardContent}
                  </Pressable>
                );
              }
              return <View key={ex.exerciseId}>{cardContent}</View>;
            })}
          </ScrollView>

          <Button
            mode="contained"
            onPress={onClose}
            style={[primaryCapsule.style, { marginTop: appTheme.spacing.lg }]}
            contentStyle={primaryCapsule.contentStyle}
            labelStyle={primaryCapsule.labelStyle}
          >
            Back to workout
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}
