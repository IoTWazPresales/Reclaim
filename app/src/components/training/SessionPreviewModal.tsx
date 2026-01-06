// Session Preview Modal - Show session plan before starting
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Modal, Portal, Card, Text, Button, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { getExerciseById } from '@/lib/training/engine';
import type { SessionPlan } from '@/lib/training/types';

interface SessionPreviewModalProps {
  visible: boolean;
  plan: SessionPlan | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SessionPreviewModal({ visible, plan, onConfirm, onCancel }: SessionPreviewModalProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  if (!plan) return null;

  const formatGoals = () => {
    const entries = Object.entries(plan.goals)
      .filter(([, weight]) => weight && weight > 0)
      .map(([goal, weight]) => `${goal.replace('_', ' ')}: ${Math.round(weight * 100)}%`);
    return entries.join(', ');
  };

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

          <ScrollView style={{ maxHeight: 400 }}>
            {/* Session Info */}
            <Card mode="outlined" style={{ marginBottom: appTheme.spacing.md, borderRadius: appTheme.borderRadius.lg }}>
              <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: appTheme.spacing.xs }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Template</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {plan.template.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: appTheme.spacing.xs }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Exercises</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {plan.exercises.length}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: appTheme.spacing.xs }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Duration</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    ~{plan.estimatedDurationMinutes} min
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Goals</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1, textAlign: 'right' }}>
                    {formatGoals()}
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
                  mode="outlined"
                  style={{ marginBottom: appTheme.spacing.sm, borderRadius: appTheme.borderRadius.lg }}
                >
                  <Card.Content>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                          {idx + 1}. {exercise.name}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                          {totalSets} sets × {avgReps} reps @ ~{avgWeight}kg
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.primaryContainer, marginTop: appTheme.spacing.xs }}>
                          {ex.priority} • {ex.intents.join(', ')}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: appTheme.spacing.lg, gap: appTheme.spacing.md }}>
            <Button mode="outlined" onPress={onCancel} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button mode="contained" onPress={onConfirm} style={{ flex: 1 }}>
              Start Session
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}
