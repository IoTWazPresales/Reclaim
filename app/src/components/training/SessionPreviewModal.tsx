// Session Preview Modal - Show session plan before starting
import React, { useMemo } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Modal, Portal, Card, Text, Button, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { reclaimPrimaryCapsuleButton, reclaimTertiaryOutlineCapsuleButton } from '@/theme/reclaimVisualLanguage';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { getExerciseById } from '@/lib/training/engine';
import type { SessionPlan, MovementIntent } from '@/lib/training/types';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';
import { formatWeight, formatReps, formatDuration } from './uiFormat';

interface SessionPreviewModalProps {
  visible: boolean;
  plan: SessionPlan | null;
  sessionMode: 'normal' | 'guided';
  onSessionModeChange: (mode: 'normal' | 'guided') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SessionPreviewModal({
  visible,
  plan,
  sessionMode,
  onSessionModeChange,
  onConfirm,
  onCancel,
}: SessionPreviewModalProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  // Stack vertically on compact widths to prevent "Start session" text truncation.
  // 420 matches the compactSessionLayout threshold used in TrainingSessionView.
  const stackActions = winW < 420;
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const tertiaryCapsule = useMemo(() => reclaimTertiaryOutlineCapsuleButton(appTheme), [appTheme]);

  // Get top lifts (primary exercises, max 2) - ALWAYS call hooks before early return
  const topLifts = useMemo(() => {
    if (!plan || !plan.exercises || plan.exercises.length === 0) return [];
    const primary = plan.exercises.filter((ex) => ex.priority === 'primary');
    if (primary.length > 0) {
      return primary.slice(0, 2).map((ex) => {
        const exercise = getExerciseById(ex.exerciseId);
        return exercise ? exercise.name : null;
      }).filter(Boolean) as string[];
    }
    // Fallback to first 2 exercises if no primary
    return plan.exercises.slice(0, 2).map((ex) => {
      const exercise = getExerciseById(ex.exerciseId);
      return exercise ? exercise.name : null;
    }).filter(Boolean) as string[];
  }, [plan?.exercises]);

  const formatGoals = useMemo(() => {
    if (!plan?.goals) return '';
    const entries = Object.entries(plan.goals)
      .filter(([, weight]) => weight && weight > 0)
      .map(([goal, weight]) => `${goal.replace('_', ' ')}: ${Math.round(weight * 100)}%`);
    return entries.join(', ');
  }, [plan?.goals]);

  // Early return AFTER all hooks are called - but handle null plan gracefully
  if (!plan || !visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          margin: appTheme.spacing.lg,
          borderRadius: appTheme.borderRadius.xl,
          maxHeight: '85%',
        }}
      >
        <View style={{ padding: appTheme.spacing.lg }}>
          <FeatureCardHeader icon="dumbbell" title="Session Preview" />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.sm, marginBottom: appTheme.spacing.lg }}>
            Review your workout plan before starting
          </Text>

          <Card mode="elevated" style={{ marginBottom: appTheme.spacing.md, borderRadius: appTheme.borderRadius.lg, backgroundColor: theme.colors.elevation.level1 }}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                Session mode
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}
              >
                Guided forces actionable training notifications during the session.
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

          <ScrollView style={{ maxHeight: 400 }}>
            {/* Session Info */}
            <Card mode="elevated" style={{ marginBottom: appTheme.spacing.md, borderRadius: appTheme.borderRadius.lg, backgroundColor: theme.colors.elevation.level1 }}>
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: appTheme.spacing.sm }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 80, marginRight: appTheme.spacing.sm }}>Template</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }}>
                    {plan.template.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: appTheme.spacing.sm }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 80, marginRight: appTheme.spacing.sm }}>Exercises</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }}>
                    {plan.exercises.length}
                  </Text>
                </View>
                {topLifts.length > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: appTheme.spacing.sm }}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 80, marginRight: appTheme.spacing.sm }}>Top lifts</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }} numberOfLines={2}>
                      {topLifts.join(', ')}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: appTheme.spacing.sm }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 80, marginRight: appTheme.spacing.sm }}>Duration</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }}>
                    ~{formatDuration(plan.estimatedDurationMinutes)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 80, marginRight: appTheme.spacing.sm }}>Goals</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }} numberOfLines={3}>
                    {formatGoals}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {/* Exercise List */}
            <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
              Exercises
            </Text>
            {plan.exercises.map((ex, idx) => {
              const exercise = getExerciseById(ex.exerciseId);
              if (!exercise) return null;
              const totalSets = ex.plannedSets.length;
              const avgReps = Math.round(
                ex.plannedSets.reduce((sum, s) => sum + s.targetReps, 0) / ex.plannedSets.length,
              );
              const avgWeight = Math.round(
                ex.plannedSets.reduce((sum, s) => sum + s.suggestedWeight, 0) / ex.plannedSets.length,
              );

              return (
                <Card
                  key={ex.exerciseId}
                  mode="elevated"
                  style={{ marginBottom: appTheme.spacing.sm, borderRadius: appTheme.borderRadius.lg, backgroundColor: theme.colors.elevation.level1 }}
                >
                  <Card.Content>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                          {idx + 1}. {exercise.name}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                          {totalSets} sets {formatReps(avgReps)} @ ~{formatWeight(avgWeight)}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.primaryContainer, marginTop: appTheme.spacing.xs }}>
                          {ex.priority}
                          {ex.intents && ex.intents.length > 0
                            ? ` • ${getPrimaryIntentLabels(ex.intents as MovementIntent[], 2).join(', ')}`
                            : ''}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </ScrollView>

          <View
            style={{
              flexDirection: stackActions ? 'column-reverse' : 'row',
              justifyContent: 'space-between',
              marginTop: appTheme.spacing.lg,
              gap: appTheme.spacing.md,
              paddingBottom: Math.max(insets.bottom, appTheme.spacing.md),
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
      </Modal>
    </Portal>
  );
}
