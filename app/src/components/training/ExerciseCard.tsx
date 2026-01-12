// Exercise Card - Individual exercise in a training session
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Button, Card, Text, useTheme, Portal, Dialog, TextInput, Chip, IconButton } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { getWeightStep } from '@/lib/training/progression';
import type { Exercise, DecisionTrace, MovementIntent } from '@/lib/training/types';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';
import { formatWeight, formatReps, formatRest, formatWeightReps } from './uiFormat';

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
  decisionTrace?: DecisionTrace;
  onSetComplete: (setIndex: number, weight: number, reps: number, rpe?: number) => void;
  onSkip: () => void;
  onNext: () => void;
  isComplete: boolean;
  lastPerformance?: { weight: number; reps: number; date?: string };
  adjustedSetParams?: {
    setIndex: number;
    targetReps: number;
    suggestedWeight: number;
    message?: string;
  };
  // Optional: callback when set is done to show overlay
  onSetDoneShowOverlay?: (setIndex: number) => void;
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
  lastPerformance,
  adjustedSetParams,
  onSetDoneShowOverlay,
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
  const [whyDialogExpanded, setWhyDialogExpanded] = useState(false);
  // Track current weight/reps for each pending set
  const [setAdjustments, setSetAdjustments] = useState<Record<number, { weight: number; reps: number }>>({});
  // Warm-up sets state
  const [showWarmups, setShowWarmups] = useState(false);
  const [completedWarmups, setCompletedWarmups] = useState<Set<number>>(new Set());

  // Initialize adjustments from planned sets and autoregulated params
  // IMPORTANT: adjustedSetParams applies ONLY to the next pending set (first non-performed set)
  React.useEffect(() => {
    const adjustments: Record<number, { weight: number; reps: number }> = {};
    
    // Find the first pending set (next set to perform)
    const firstPendingSet = plannedSets.find((planned) => {
      const performed = performedSets.find((s) => s.setIndex === planned.setIndex);
      return !performed;
    });
    
    plannedSets.forEach((planned) => {
      const performed = performedSets.find((s) => s.setIndex === planned.setIndex);
      if (!performed) {
        // Only apply adjusted params to the FIRST pending set (next set to perform)
        if (adjustedSetParams && firstPendingSet && adjustedSetParams.setIndex === firstPendingSet.setIndex && adjustedSetParams.setIndex === planned.setIndex) {
          adjustments[planned.setIndex] = {
            weight: adjustedSetParams.suggestedWeight,
            reps: adjustedSetParams.targetReps,
          };
        } else {
          adjustments[planned.setIndex] = {
            weight: planned.suggestedWeight,
            reps: planned.targetReps,
          };
        }
      }
    });
    setSetAdjustments(adjustments);
  }, [plannedSets, performedSets, adjustedSetParams]);

  const handleSetDone = (setIndex: number) => {
    const planned = plannedSets.find((s) => s.setIndex === setIndex);
    const performed = performedSets.find((s) => s.setIndex === setIndex);

    if (performed) {
      // Already done, allow edit
      setEditingSetIndex(setIndex);
      setEditWeight(performed.weight.toString() || '0');
      setEditReps(performed.reps.toString() || '0');
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
            <View style={{ flex: 1, marginRight: appTheme.spacing.sm }}>
        <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.onSurface }} numberOfLines={2}>
          {exercise.name}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }} numberOfLines={2}>
          {exercise.intents && exercise.intents.length > 0
            ? getPrimaryIntentLabels(exercise.intents as MovementIntent[], 3).join(' • ')
            : ''}
        </Text>
        {lastPerformance && (
          <View style={{ marginTop: appTheme.spacing.sm, padding: appTheme.spacing.sm, backgroundColor: theme.colors.primaryContainer, borderRadius: appTheme.borderRadius.md }}>
            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }} numberOfLines={1}>
              Previous: {formatWeightReps(lastPerformance.weight, lastPerformance.reps)}
              {lastPerformance.date && ` • ${new Date(lastPerformance.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </Text>
          </View>
        )}
            </View>
            <View style={{ flexDirection: 'row', gap: 4, flexShrink: 0 }}>
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

          {/* Warm-up sets (optional, collapsible) */}
          {plannedSets.length > 0 && (
            <View style={{ marginTop: appTheme.spacing.md }}>
              <Button
                mode="text"
                compact
                icon={showWarmups ? 'chevron-up' : 'chevron-down'}
                onPress={() => setShowWarmups(!showWarmups)}
                style={{ alignSelf: 'flex-start', marginBottom: appTheme.spacing.xs }}
              >
                Warm-up sets {showWarmups ? '(hide)' : '(show)'}
              </Button>
              {showWarmups && (() => {
                const targetWeight = plannedSets[0]?.suggestedWeight || 0;
                // Determine rounding step: dumbbells use 1kg or 2kg, barbells use 2.5kg
                const equipment = exercise.equipment || [];
                const isDumbbell = equipment.some(eq => eq.includes('dumbbell') || eq === 'dumbbells');
                const warmupStep = isDumbbell ? 1 : 2.5; // Dumbbells: 1kg steps, Barbells: 2.5kg steps
                
                const warmupWeights = [
                  Math.round((targetWeight * 0.4) / warmupStep) * warmupStep,
                  Math.round((targetWeight * 0.6) / warmupStep) * warmupStep,
                  Math.round((targetWeight * 0.8) / warmupStep) * warmupStep,
                ].filter(w => w > 0);

                return (
                  <View style={{ marginBottom: appTheme.spacing.md }}>
                    {warmupWeights.map((weight, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: appTheme.spacing.sm,
                          paddingHorizontal: appTheme.spacing.sm,
                          marginBottom: appTheme.spacing.xs,
                          backgroundColor: completedWarmups.has(idx)
                            ? theme.colors.primaryContainer
                            : theme.colors.surfaceVariant,
                          borderRadius: appTheme.borderRadius.md,
                        }}
                      >
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                          {formatWeight(weight)} × 5
                        </Text>
                        <Button
                          mode={completedWarmups.has(idx) ? 'outlined' : 'contained-tonal'}
                          compact
                          onPress={() => {
                            const newCompleted = new Set(completedWarmups);
                            if (newCompleted.has(idx)) {
                              newCompleted.delete(idx);
                            } else {
                              newCompleted.add(idx);
                            }
                            setCompletedWarmups(newCompleted);
                          }}
                        >
                          {completedWarmups.has(idx) ? 'Done' : 'Skip'}
                        </Button>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </View>
          )}

          {/* Sets */}
          <View style={{ marginTop: appTheme.spacing.sm }}>
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
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={2}>
                          {formatWeightReps(performed.weight, performed.reps)}
                          {performed.rpe ? ` @ RPE ${performed.rpe}` : ''}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }} numberOfLines={1}>
                          Planned: {formatWeightReps(planned.suggestedWeight, planned.targetReps)}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: appTheme.spacing.xs, gap: appTheme.spacing.md }}>
                          {/* Weight controls */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                            <IconButton
                              icon="minus"
                              size={18}
                              onPress={() => adjustWeight(planned.setIndex, -1)}
                              style={{ margin: 0, padding: 0, width: 32, height: 32 }}
                            />
                            <View style={{ alignItems: 'center', minWidth: 60 }}>
                              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, textAlign: 'center', marginHorizontal: appTheme.spacing.xs }}>
                                {formatWeight(setAdjustments[planned.setIndex]?.weight ?? planned.suggestedWeight)}
                              </Text>
                              {/* Show adjustment indicator if different from planned */}
                              {adjustedSetParams && adjustedSetParams.setIndex === planned.setIndex && adjustedSetParams.suggestedWeight !== planned.suggestedWeight && (
                                <Text variant="bodySmall" style={{ color: theme.colors.primary, fontSize: 10 }}>
                                  {adjustedSetParams.suggestedWeight < planned.suggestedWeight ? '↓' : '↑'} adjusted
                                </Text>
                              )}
                            </View>
                            <IconButton
                              icon="plus"
                              size={18}
                              onPress={() => adjustWeight(planned.setIndex, 1)}
                              style={{ margin: 0, padding: 0, width: 32, height: 32 }}
                            />
                          </View>
                          {/* Separator */}
                          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginHorizontal: appTheme.spacing.xs }}>
                            ×
                          </Text>
                          {/* Reps controls */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                            <IconButton
                              icon="minus"
                              size={18}
                              onPress={() => adjustReps(planned.setIndex, -1)}
                              style={{ margin: 0, padding: 0, width: 32, height: 32 }}
                            />
                            <View style={{ alignItems: 'center', minWidth: 35 }}>
                              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, textAlign: 'center', marginHorizontal: appTheme.spacing.xs }}>
                                {formatReps(setAdjustments[planned.setIndex]?.reps ?? planned.targetReps)}
                              </Text>
                              {/* Show adjustment indicator if different from planned */}
                              {adjustedSetParams && adjustedSetParams.setIndex === planned.setIndex && adjustedSetParams.targetReps !== planned.targetReps && (
                                <Text variant="bodySmall" style={{ color: theme.colors.primary, fontSize: 10 }}>
                                  {adjustedSetParams.targetReps < planned.targetReps ? '↓' : '↑'} adjusted
                                </Text>
                              )}
                            </View>
                            <IconButton
                              icon="plus"
                              size={18}
                              onPress={() => adjustReps(planned.setIndex, 1)}
                              style={{ margin: 0, padding: 0, width: 32, height: 32 }}
                            />
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: appTheme.spacing.sm, flexWrap: 'wrap', marginTop: appTheme.spacing.xs }}>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                            Rest: {formatRest(planned.restSeconds)}
                          </Text>
                          {quickRpe && (
                            <Chip
                              icon="gauge"
                              onPress={() => setShowRpeDialog(true)}
                              style={{ height: 24, flexShrink: 0 }}
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
                              style={{ height: 24, flexShrink: 0 }}
                              labelStyle={{ fontSize: 12 }}
                            >
                              +RPE
                            </Button>
                          )}
                        </View>
                        {/* Show autoregulation indicator for next set */}
                        {adjustedSetParams && adjustedSetParams.setIndex === planned.setIndex && adjustedSetParams.message && (
                          <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: appTheme.spacing.xs, fontStyle: 'italic' }}>
                            💡 {adjustedSetParams.message}
                          </Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'column', gap: appTheme.spacing.xs, alignItems: 'flex-end' }}>
                        <Button
                          mode="contained"
                          compact
                          onPress={() => {
                            // One-tap confirm: use planned values as-is
                            const adjustment = setAdjustments[planned.setIndex];
                            const finalWeight = adjustment?.weight ?? planned.suggestedWeight;
                            const finalReps = adjustment?.reps ?? planned.targetReps;
                            const finalRpe = quickRpe ?? undefined;
                            onSetComplete(planned.setIndex, finalWeight, finalReps, finalRpe);
                            setQuickRpe(null);
                            // Show overlay if callback provided
                            if (onSetDoneShowOverlay) {
                              onSetDoneShowOverlay(planned.setIndex);
                            }
                          }}
                          style={{ minWidth: 80 }}
                        >
                          Done
                        </Button>
                        <Button
                          mode="text"
                          compact
                          onPress={() => {
                            // Open adjust mode (edit dialog)
                            setEditingSetIndex(planned.setIndex);
                            const adjustment = setAdjustments[planned.setIndex];
                            setEditWeight((adjustment?.weight ?? planned.suggestedWeight).toString() || '0');
                            setEditReps((adjustment?.reps ?? planned.targetReps).toString() || '0');
                            setEditRpe(quickRpe?.toString() || '');
                          }}
                          style={{ minWidth: 80 }}
                          textColor={theme.colors.onSurfaceVariant}
                        >
                          Adjust
                        </Button>
                      </View>
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
          <Dialog.Title>Adjust Set {editingSetIndex}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
              Weight (kg)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: appTheme.spacing.md, gap: appTheme.spacing.xs }}>
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  const current = parseFloat(editWeight) || 0;
                  setEditWeight(Math.max(0, current - 10).toString());
                }}
              >
                -10
              </Button>
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  const current = parseFloat(editWeight) || 0;
                  setEditWeight(Math.max(0, current - 5).toString());
                }}
              >
                -5
              </Button>
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  const current = parseFloat(editWeight) || 0;
                  setEditWeight(Math.max(0, current - 2.5).toString());
                }}
              >
                -2.5
              </Button>
              <TextInput
                value={editWeight || ''}
                onChangeText={(text: string) => setEditWeight(text)}
                keyboardType="numeric"
                mode="outlined"
                style={{ flex: 1, minWidth: 80 }}
              />
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  const current = parseFloat(editWeight) || 0;
                  setEditWeight((current + 2.5).toString());
                }}
              >
                +2.5
              </Button>
            </View>
            <Text variant="bodyMedium" style={{ marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
              Reps
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: appTheme.spacing.md, gap: appTheme.spacing.xs }}>
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  const current = parseInt(editReps, 10) || 0;
                  setEditReps(Math.max(0, current - 1).toString());
                }}
              >
                -1
              </Button>
              <TextInput
                value={editReps || ''}
                onChangeText={(text: string) => setEditReps(text)}
                keyboardType="numeric"
                mode="outlined"
                style={{ flex: 1, minWidth: 80 }}
              />
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  const current = parseInt(editReps, 10) || 0;
                  setEditReps((current + 1).toString());
                }}
              >
                +1
              </Button>
            </View>
            <TextInput
              label="RPE (1-10, optional)"
              value={editRpe || ''}
              onChangeText={(text: string) => setEditRpe(text)}
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
          onDismiss={() => {
            setShowWhyDialog(false);
            setWhyDialogExpanded(false);
          }}
          style={{ maxHeight: '80%' }}
        >
          <Dialog.Title>Why {exercise.name}?</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ padding: appTheme.spacing.lg }}>
                {decisionTrace && (
                  <>
                    {/* Compact Summary */}
                    <View style={{ marginBottom: appTheme.spacing.md, padding: appTheme.spacing.md, backgroundColor: theme.colors.primaryContainer, borderRadius: appTheme.borderRadius.md }}>
                      <Text variant="bodyMedium" style={{ marginBottom: appTheme.spacing.xs, color: theme.colors.onPrimaryContainer, fontWeight: '600' }}>
                        Summary
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }} numberOfLines={3}>
                        {decisionTrace.selectionReason}
                        {decisionTrace.constraintsApplied.length > 0 && ` (${decisionTrace.constraintsApplied.length} constraint${decisionTrace.constraintsApplied.length !== 1 ? 's' : ''} applied)`}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: appTheme.spacing.xs }}>
                        Confidence: {Math.round(decisionTrace.confidence * 100)}%
                      </Text>
                    </View>

                    {/* Goal bias - always shown */}
                    <View style={{ marginBottom: appTheme.spacing.md }}>
                      <Text variant="titleSmall" style={{ marginBottom: appTheme.spacing.sm, fontWeight: '700', color: theme.colors.onSurface }}>
                        Goal bias
                      </Text>
                      {Object.entries(decisionTrace.goalBias)
                        .filter(([, weight]) => weight && weight > 0)
                        .map(([goal, weight]) => (
                          <View key={goal} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: appTheme.spacing.xs }}>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                              {goal.replace('_', ' ')}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                              {Math.round((weight as number) * 100)}%
                            </Text>
                          </View>
                        ))}
                    </View>

                    {/* Top 3 alternatives - always shown */}
                    {decisionTrace.rankedAlternatives.length > 0 && (
                      <View style={{ marginBottom: appTheme.spacing.md }}>
                        <Text variant="titleSmall" style={{ marginBottom: appTheme.spacing.sm, fontWeight: '700', color: theme.colors.onSurface }}>
                          Top alternatives
                        </Text>
                        {decisionTrace.rankedAlternatives.slice(0, 3).map((alt, idx) => (
                          <Text key={idx} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }} numberOfLines={2}>
                            {idx + 1}. {alt}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Expandable section */}
                    {(decisionTrace.constraintsApplied.length > 0 || decisionTrace.rankedAlternatives.length > 3) && (
                      <>
                        <Button
                          mode="text"
                          compact
                          icon={whyDialogExpanded ? 'chevron-up' : 'chevron-down'}
                          onPress={() => setWhyDialogExpanded(!whyDialogExpanded)}
                          style={{ marginBottom: appTheme.spacing.sm }}
                        >
                          {whyDialogExpanded ? 'Show less' : 'Show more'}
                        </Button>

                        {whyDialogExpanded && (
                          <>
                            {decisionTrace.constraintsApplied.length > 0 && (
                              <View style={{ marginBottom: appTheme.spacing.md }}>
                                <Text variant="titleSmall" style={{ marginBottom: appTheme.spacing.sm, fontWeight: '700', color: theme.colors.onSurface }}>
                                  Constraints applied
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.xs, alignItems: 'flex-start' }}>
                                  {decisionTrace.constraintsApplied.map((constraint, idx) => (
                                    <Chip key={idx} mode="outlined" style={{ marginBottom: 0 }}>
                                      {constraint}
                                    </Chip>
                                  ))}
                                </View>
                              </View>
                            )}

                            {decisionTrace.rankedAlternatives.length > 3 && (
                              <View>
                                <Text variant="titleSmall" style={{ marginBottom: appTheme.spacing.sm, fontWeight: '700', color: theme.colors.onSurface }}>
                                  All alternatives
                                </Text>
                                {decisionTrace.rankedAlternatives.slice(3).map((alt, idx) => (
                                  <Text key={idx + 3} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }} numberOfLines={2}>
                                    {idx + 4}. {alt}
                                  </Text>
                                ))}
                              </View>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
                {!decisionTrace && (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    No decision trace available.
                  </Text>
                )}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowWhyDialog(false);
              setWhyDialogExpanded(false);
            }}>Close</Button>
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
