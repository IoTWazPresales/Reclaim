// Session Preview Modal - Show session plan before starting
import React, { useMemo, useState } from 'react';
import { View, ScrollView, useWindowDimensions, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Modal, Portal, Card, Text, Button, useTheme, Divider, IconButton } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { reclaimPrimaryCapsuleButton, reclaimTertiaryOutlineCapsuleButton } from '@/theme/reclaimVisualLanguage';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { getExerciseById } from '@/lib/training/engine';
import type { SessionPlan, MovementIntent, Exercise } from '@/lib/training/types';
import { formatExercisePreviewLine } from '@/lib/training/loadDisplayFormat';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';
import { formatDuration } from './uiFormat';
import ExerciseDetailsModal from './ExerciseDetailsModal';

interface SessionPreviewModalProps {
  visible: boolean;
  plan: SessionPlan | null;
  sessionMode: 'normal' | 'guided';
  onSessionModeChange: (mode: 'normal' | 'guided') => void;
  onConfirm: () => void;
  onCancel: () => void;
  /** e.g. "Chest 12 · Shoulders 10 · Arms 8" */
  weeklySetsLine?: string | null;
}

export default function SessionPreviewModal({
  visible,
  plan,
  sessionMode,
  onSessionModeChange,
  onConfirm,
  onCancel,
  weeklySetsLine,
}: SessionPreviewModalProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const stackActions = winW < 420;
  const [guidanceExercise, setGuidanceExercise] = useState<Exercise | null>(null);
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const tertiaryCapsule = useMemo(() => reclaimTertiaryOutlineCapsuleButton(appTheme), [appTheme]);
  // Leave room for Modal margins + safe area so the sheet doesn't overflow the viewport.
  const sheetVerticalChrome =
    appTheme.spacing.lg * 2 + insets.top + insets.bottom;
  const sheetMaxH = Math.max(320, Math.min(winH * 0.88, 720) - sheetVerticalChrome);

  const topLifts = useMemo(() => {
    if (!plan?.exercises?.length) return [];
    const primary = plan.exercises.filter((ex) => ex.priority === 'primary');
    const source = primary.length > 0 ? primary : plan.exercises;
    return source
      .slice(0, 2)
      .map((ex) => getExerciseById(ex.exerciseId)?.name)
      .filter(Boolean) as string[];
  }, [plan?.exercises]);

  const formatGoals = useMemo(() => {
    if (!plan?.goals) return '';
    return Object.entries(plan.goals)
      .filter(([, weight]) => weight && weight > 0)
      .map(([goal, weight]) => `${goal.replace('_', ' ')}: ${Math.round(weight * 100)}%`)
      .join(', ');
  }, [plan?.goals]);

  if (!plan || !visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={{
          backgroundColor: theme.colors.elevation.level3,
          marginTop: appTheme.spacing.lg + insets.top,
          marginBottom: appTheme.spacing.lg + insets.bottom,
          marginHorizontal: Math.max(appTheme.spacing.md, insets.left, insets.right),
          borderRadius: appTheme.borderRadius.xl,
          // Explicit height — flex:1 inside Paper Modal collapses to empty dim overlay on Android.
          height: sheetMaxH,
          maxHeight: sheetMaxH,
          maxWidth: 560,
          alignSelf: 'center',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <View style={{ height: sheetMaxH, flexDirection: 'column' }}>
          {/* Pinned header */}
          <View style={{ paddingHorizontal: appTheme.spacing.lg, paddingTop: appTheme.spacing.lg, paddingBottom: appTheme.spacing.sm }}>
            <FeatureCardHeader icon="dumbbell" title="Session Preview" />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.sm }}>
              Review your workout plan before starting
            </Text>
            <Card
              mode="elevated"
              style={{ marginTop: appTheme.spacing.md, borderRadius: appTheme.borderRadius.lg, backgroundColor: theme.colors.elevation.level1 }}
            >
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                  Session mode
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {sessionMode === 'normal'
                    ? 'You drive; in-app rest timers.'
                    : 'Watch + lock screen walk you set-by-set.'}
                </Text>
                <View style={{ flexDirection: 'row', gap: appTheme.spacing.sm, marginTop: appTheme.spacing.md }}>
                  <Button
                    mode={sessionMode === 'normal' ? 'contained' : 'outlined'}
                    onPress={() => onSessionModeChange('normal')}
                    buttonColor={sessionMode === 'normal' ? theme.colors.primary : undefined}
                    textColor={sessionMode === 'normal' ? theme.colors.onPrimary : undefined}
                    style={[{ flex: 1, minWidth: 0 }, sessionMode === 'normal' ? primaryCapsule.style : tertiaryCapsule.style]}
                    contentStyle={sessionMode === 'normal' ? primaryCapsule.contentStyle : tertiaryCapsule.contentStyle}
                    labelStyle={
                      sessionMode === 'normal'
                        ? [primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]
                        : tertiaryCapsule.labelStyle
                    }
                  >
                    Normal
                  </Button>
                  <Button
                    mode={sessionMode === 'guided' ? 'contained' : 'outlined'}
                    onPress={() => onSessionModeChange('guided')}
                    buttonColor={sessionMode === 'guided' ? theme.colors.primary : undefined}
                    textColor={sessionMode === 'guided' ? theme.colors.onPrimary : undefined}
                    style={[{ flex: 1, minWidth: 0 }, sessionMode === 'guided' ? primaryCapsule.style : tertiaryCapsule.style]}
                    contentStyle={sessionMode === 'guided' ? primaryCapsule.contentStyle : tertiaryCapsule.contentStyle}
                    labelStyle={
                      sessionMode === 'guided'
                        ? [primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]
                        : tertiaryCapsule.labelStyle
                    }
                  >
                    Guided
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* Single scroll surface — summary + exercise list */}
          <ScrollView
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{
              paddingHorizontal: appTheme.spacing.lg,
              paddingBottom: appTheme.spacing.md,
            }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={Platform.OS === 'android'}
            showsVerticalScrollIndicator
          >
            <Card
              mode="elevated"
              style={{ marginBottom: appTheme.spacing.md, borderRadius: appTheme.borderRadius.lg, backgroundColor: theme.colors.elevation.level1 }}
            >
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: appTheme.spacing.sm }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 80, marginRight: appTheme.spacing.sm }}>
                    Template
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }}>
                    {plan.template.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: appTheme.spacing.sm }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 80, marginRight: appTheme.spacing.sm }}>
                    Exercises
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }}>
                    {plan.exercises.length}
                  </Text>
                </View>
                {topLifts.length > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: appTheme.spacing.sm }}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 80, marginRight: appTheme.spacing.sm }}>
                      Top lifts
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }} numberOfLines={2}>
                      {topLifts.join(', ')}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: appTheme.spacing.sm }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 80, marginRight: appTheme.spacing.sm }}>
                    Duration
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }}>
                    ~{formatDuration(plan.estimatedDurationMinutes)}
                  </Text>
                </View>
                {weeklySetsLine ? (
                  <View style={{ marginBottom: appTheme.spacing.sm }}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                      Weekly sets
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                      {weeklySetsLine}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 80, marginRight: appTheme.spacing.sm }}>
                    Goals
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }} numberOfLines={3}>
                    {formatGoals}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
              Exercises
            </Text>
            {plan.exercises.map((ex, idx) => {
              const exercise = getExerciseById(ex.exerciseId);
              if (!exercise) return null;
              return (
                <Card
                  key={ex.exerciseId}
                  mode="elevated"
                  style={{ marginBottom: appTheme.spacing.sm, borderRadius: appTheme.borderRadius.lg, backgroundColor: theme.colors.elevation.level1 }}
                >
                  <Card.Content>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: appTheme.spacing.sm }}>
                        <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                          {idx + 1}. {exercise.name}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                          {formatExercisePreviewLine(ex, exercise)}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: appTheme.spacing.xs }}>
                          {ex.priority}
                          {ex.intents?.length
                            ? ` • ${getPrimaryIntentLabels(ex.intents as MovementIntent[], 2).join(', ')}`
                            : ''}
                          {exercise.id === 'pallof_press' ? ' · anti-rotation core' : ''}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setGuidanceExercise(exercise)}
                        accessibilityRole="button"
                        accessibilityLabel={`How to do ${exercise.name}`}
                        hitSlop={8}
                        style={({ pressed }) => ({
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: theme.colors.outline,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                          ?
                        </Text>
                      </Pressable>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </ScrollView>

          {/* Pinned footer */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: appTheme.spacing.lg,
              paddingTop: appTheme.spacing.md,
              paddingBottom: Math.max(insets.bottom, appTheme.spacing.md),
            }}
          >
            <Divider style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 }} />
            <View
              style={{
                flexDirection: stackActions ? 'column-reverse' : 'row',
                justifyContent: 'space-between',
                gap: appTheme.spacing.md,
              }}
            >
              <Button
                mode="outlined"
                onPress={onCancel}
                style={[{ flex: stackActions ? 0 : 1, minWidth: 0, alignSelf: stackActions ? 'stretch' : undefined }, tertiaryCapsule.style]}
                contentStyle={[tertiaryCapsule.contentStyle, { paddingHorizontal: 12 }]}
                labelStyle={tertiaryCapsule.labelStyle}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={onConfirm}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
                style={[{ flex: stackActions ? 0 : 1, minWidth: 0, alignSelf: stackActions ? 'stretch' : undefined }, primaryCapsule.style]}
                contentStyle={[primaryCapsule.contentStyle, { paddingHorizontal: 12 }]}
                labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
              >
                Start session
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      <ExerciseDetailsModal
        visible={!!guidanceExercise}
        exercise={guidanceExercise}
        onDismiss={() => setGuidanceExercise(null)}
        guidanceOnly
      />
    </Portal>
  );
}
