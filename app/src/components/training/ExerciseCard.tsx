// Exercise Card - Individual exercise in a training session
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Button, Card, Text, useTheme, Portal, Dialog, TextInput, Chip, IconButton } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { getWeightStep } from '@/lib/training/progression';
import type { Exercise, DecisionTrace } from '@/lib/training/types';

interface PlannedSet {
  setIndex: number;
  targetReps: number;
  suggestedWeight: number;
  restSeconds: number;
}

interface PerformedSet {
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  plannedSets: PlannedSet[];
  performedSets: PerformedSet[];
  decisionTrace: DecisionTrace;
  onSetComplete: (setIndex: number, weight: number, reps: number, rpe?: number) => void;
  onSkip: () => void;
  onNext: () => void;
  isComplete: boolean;
}

export default function ExerciseCard({
  exercise,
  plannedSets,
  performedSets,
  decisionTrace,
  onSetComplete,
  onSkip,
  onNext,
  isComplete,
}: ExerciseCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editRpe, setEditRpe] = useState('');
  const [showWhyDialog, setShowWhyDialog] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [showRpeDialog, setShowRpeDialog] = useState(false);
  const [quickRpe, setQuickRpe] = useState<number | null>(null);
  // Track current weight/reps for each pending set
  const [setAdjustments, setSetAdjustments] = useState<Record<number, { weight: number; reps: number }>>({});

  // Initialize adjustments from planned sets
  React.useEffect(() => {
    const adjustments: Record<number, { weight: number; reps: number }> = {};
    plannedSets.forEach((planned) => {
      const performed = performedSets.find((s) => s.setIndex === planned.setIndex);
      if (!performed) {
        adjustments[planned.setIndex] = {
          weight: planned.suggestedWeight,
          reps: planned.targetReps,
        };
      }
    });
    setSetAdjustments(adjustments);
  }, [plannedSets, performedSets]);

  const handleSetDone = (setIndex: number) => {
    const planned = plannedSets.find((s) => s.setIndex === setIndex);
    const performed = performedSets.find((s) => s.setIndex === setIndex);

    if (performed) {
      // Already done, allow edit
      setEditingSetIndex(setIndex);
      setEditWeight(performed.weight.toString());
      setEditReps(performed.reps.toString());
      setEditRpe(performed.rpe?.toString() || '');
    } else if (planned) {
      // Use current adjustments or planned defaults
      const adjustment = setAdjustments[setIndex];
      const finalWeight = adjustment?.weight ?? planned.suggestedWeight;
      const finalReps = adjustment?.reps ?? planned.targetReps;
      const finalRpe = quickRpe ?? undefined;
      onSetComplete(setIndex, finalWeight, finalReps, finalRpe);
      setQuickRpe(null); // Reset after use
    }
  };

  const adjustWeight = (setIndex: number, delta: number) => {
    const planned = plannedSets.find((s) => s.setIndex === setIndex);
    if (!planned) return;
    const step = getWeightStep(exercise);
    const current = setAdjustments[setIndex] || { weight: planned.suggestedWeight, reps: planned.targetReps };
    const newWeight = Math.max(0, current.weight + delta * step);
    setSetAdjustments((prev) => ({
      ...prev,
      [setIndex]: { ...current, weight: newWeight },
    }));
  };

  const adjustReps = (setIndex: number, delta: number) => {
    const planned = plannedSets.find((s) => s.setIndex === setIndex);
    if (!planned) return;
    const current = setAdjustments[setIndex] || { weight: planned.suggestedWeight, reps: planned.targetReps };
    const newReps = Math.max(1, current.reps + delta);
    setSetAdjustments((prev) => ({
      ...prev,
      [setIndex]: { ...current, reps: newReps },
    }));
  };

  const handleSaveEdit = () => {
    if (editingSetIndex === null) return;

    const weight = parseFloat(editWeight) || 0;
    const reps = parseInt(editReps, 10) || 0;
    const rpe = editRpe ? parseInt(editRpe, 10) : undefined;

    if (reps > 0) {
      onSetComplete(editingSetIndex, weight, reps, rpe);
      setEditingSetIndex(null);
      setEditWeight('');
      setEditReps('');
      setEditRpe('');
    }
  };

  const getSetStatus = (setIndex: number) => {
    const performed = performedSets.find((s) => s.setIndex === setIndex);
    if (performed) return 'done';
    return 'pending';
  };

  return (
    <>
      <Card mode="elevated" style={{ marginBottom: appTheme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: appTheme.borderRadius.xl }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: appTheme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                {exercise.name}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {exercise.intents.join(' • ')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Button
                mode="text"
                compact
                icon="information-outline"
                onPress={() => setShowWhyDialog(true)}
                accessibilityLabel="Why this exercise"
              >
                Why
              </Button>
              <Button mode="text" compact icon="swap-horizontal" onPress={() => setShowReplaceDialog(true)}>
                Replace
              </Button>
            </View>
          </View>

          {/* Sets */}
          <View style={{ marginTop: 8 }}>
            {plannedSets.map((planned) => {
              const status = getSetStatus(planned.setIndex);
              const performed = performedSets.find((s) => s.setIndex === planned.setIndex);

              return (
                <View
                  key={planned.setIndex}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: appTheme.spacing.md,
                    paddingHorizontal: appTheme.spacing.sm,
                    marginBottom: appTheme.spacing.sm,
                    backgroundColor: status === 'done' ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                    borderRadius: appTheme.borderRadius.md,
                  }}
                >
                  <View style={{ width: 40 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                      {planned.setIndex}
                    </Text>
                  </View>

                  {status === 'done' && performed ? (
                    <>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                          {performed.weight}kg × {performed.reps} reps
                          {performed.rpe ? ` @ RPE ${performed.rpe}` : ''}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                          Planned: {planned.suggestedWeight}kg × {planned.targetReps} reps
                        </Text>
                      </View>
                      <Button
                        mode="text"
                        compact
                        onPress={() => {
                          setEditingSetIndex(planned.setIndex);
                          setEditWeight(performed.weight.toString());
                          setEditReps(performed.reps.toString());
                          setEditRpe(performed.rpe?.toString() || '');
                        }}
                      >
                        Edit
                      </Button>
                    </>
                  ) : (
                    <>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: appTheme.spacing.xs }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <IconButton
                              icon="minus"
                              size={18}
                              onPress={() => adjustWeight(planned.setIndex, -1)}
                              style={{ margin: 0, padding: 0 }}
                            />
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, minWidth: 60, textAlign: 'center' }}>
                              {(setAdjustments[planned.setIndex]?.weight ?? planned.suggestedWeight).toFixed(1)}kg
                            </Text>
                            <IconButton
                              icon="plus"
                              size={18}
                              onPress={() => adjustWeight(planned.setIndex, 1)}
                              style={{ margin: 0, padding: 0 }}
                            />
                          </View>
                          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginHorizontal: appTheme.spacing.sm }}>
                            ×
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <IconButton
                              icon="minus"
                              size={18}
                              onPress={() => adjustReps(planned.setIndex, -1)}
                              style={{ margin: 0, padding: 0 }}
                            />
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, minWidth: 30, textAlign: 'center' }}>
                              {setAdjustments[planned.setIndex]?.reps ?? planned.targetReps}
                            </Text>
                            <IconButton
                              icon="plus"
                              size={18}
                              onPress={() => adjustReps(planned.setIndex, 1)}
                              style={{ margin: 0, padding: 0 }}
                            />
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: appTheme.spacing.sm }}>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Rest: {planned.restSeconds}s
                          </Text>
                          {quickRpe && (
                            <Chip
                              icon="gauge"
                              onPress={() => setShowRpeDialog(true)}
                              style={{ height: 24 }}
                              textStyle={{ fontSize: 12 }}
                            >
                              RPE {quickRpe}
                            </Chip>
                          )}
                          {!quickRpe && (
                            <Button
                              mode="text"
                              compact
                              onPress={() => setShowRpeDialog(true)}
                              style={{ height: 24 }}
                              labelStyle={{ fontSize: 12 }}
                            >
                              +RPE
                            </Button>
                          )}
                        </View>
                      </View>
                      <Button
                        mode="contained-tonal"
                        compact
                        onPress={() => handleSetDone(planned.setIndex)}
                        style={{ minWidth: 70 }}
                      >
                        Done
                      </Button>
                    </>
                  )}
                </View>
              );
            })}
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: appTheme.spacing.sm, marginTop: appTheme.spacing.md }}>
            <Button mode="outlined" onPress={onSkip} style={{ flex: 1 }}>
              Skip
            </Button>
            {isComplete && (
              <Button mode="contained" onPress={onNext} style={{ flex: 1 }}>
                Next exercise
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Edit set dialog */}
      <Portal>
        <Dialog visible={editingSetIndex !== null} onDismiss={() => setEditingSetIndex(null)}>
          <Dialog.Title>Edit Set {editingSetIndex}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Weight (kg)"
              value={editWeight}
              onChangeText={setEditWeight}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: appTheme.spacing.md }}
            />
            <TextInput
              label="Reps"
              value={editReps}
              onChangeText={setEditReps}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: appTheme.spacing.md }}
            />
            <TextInput
              label="RPE (1-10, optional)"
              value={editRpe}
              onChangeText={setEditRpe}
              keyboardType="numeric"
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditingSetIndex(null)}>Cancel</Button>
            <Button onPress={handleSaveEdit}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Quick RPE dialog */}
        <Dialog visible={showRpeDialog} onDismiss={() => setShowRpeDialog(false)}>
          <Dialog.Title>Rate of Perceived Exertion</Dialog.Title>
          <Dialog.Content>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {[6, 7, 8, 9, 10].map((rpe) => (
                <Chip
                  key={rpe}
                  selected={quickRpe === rpe}
                  onPress={() => {
                    setQuickRpe(rpe);
                    setShowRpeDialog(false);
                  }}
                  style={{ marginBottom: appTheme.spacing.sm }}
                >
                  {rpe}
                </Chip>
              ))}
            </View>
            <Button
              mode="text"
              onPress={() => {
                setQuickRpe(null);
                setShowRpeDialog(false);
              }}
              style={{ marginTop: 8 }}
            >
              Clear RPE
            </Button>
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Why dialog - shows decision trace as insight */}
      <Portal>
        <Dialog
          visible={showWhyDialog}
          onDismiss={() => setShowWhyDialog(false)}
          style={{ maxHeight: '80%' }}
        >
          <Dialog.Title>Why {exercise.name}?</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ padding: appTheme.spacing.lg }}>
                <Text variant="bodyMedium" style={{ marginBottom: appTheme.spacing.md, color: theme.colors.onSurface }}>
                  {decisionTrace.selectionReason}
                </Text>

                <View style={{ marginBottom: appTheme.spacing.md }}>
                  <Text variant="titleSmall" style={{ marginBottom: appTheme.spacing.sm, fontWeight: '700', color: theme.colors.onSurface }}>
                    Goal bias
                  </Text>
                  {Object.entries(decisionTrace.goalBias)
                    .filter(([, weight]) => weight && weight > 0)
                    .map(([goal, weight]) => (
                      <View key={goal} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {goal.replace('_', ' ')}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                          {Math.round((weight as number) * 100)}%
                        </Text>
                      </View>
                    ))}
                </View>

                {decisionTrace.constraintsApplied.length > 0 && (
                  <View style={{ marginBottom: appTheme.spacing.md }}>
                    <Text variant="titleSmall" style={{ marginBottom: appTheme.spacing.sm, fontWeight: '700', color: theme.colors.onSurface }}>
                      Constraints applied
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.xs }}>
                      {decisionTrace.constraintsApplied.map((constraint, idx) => (
                        <Chip key={idx} mode="outlined" style={{ marginRight: appTheme.spacing.xs, marginBottom: appTheme.spacing.xs }}>
                          {constraint}
                        </Chip>
                      ))}
                    </View>
                  </View>
                )}

                {decisionTrace.rankedAlternatives.length > 0 && (
                  <View>
                    <Text variant="titleSmall" style={{ marginBottom: appTheme.spacing.sm, fontWeight: '700', color: theme.colors.onSurface }}>
                      Alternatives considered
                    </Text>
                    {decisionTrace.rankedAlternatives.map((alt, idx) => (
                      <Text key={idx} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                        {idx + 1}. {alt}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={{ marginTop: appTheme.spacing.md }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Confidence: {Math.round(decisionTrace.confidence * 100)}%
                  </Text>
                </View>
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowWhyDialog(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Replace dialog */}
      <Portal>
        <Dialog visible={showReplaceDialog} onDismiss={() => setShowReplaceDialog(false)}>
          <Dialog.Title>Replace exercise</Dialog.Title>
          <Dialog.Content>
            <Text>Replace functionality will show ranked alternatives based on the same movement intent.</Text>
            <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
              This feature will be implemented in the next iteration.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowReplaceDialog(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
