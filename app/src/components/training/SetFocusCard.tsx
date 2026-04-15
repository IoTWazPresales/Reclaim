/**
 * SetFocusCard — Single-set focused training card.
 * Shows one set at a time with inline weight/reps editing, autoregulation message,
 * and last-session comparison. Designed to match what the watch notification shows.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Button, Card, Text, useTheme, IconButton } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { reclaimPrimaryCapsuleButton } from '@/theme/reclaimVisualLanguage';
import { formatWeight, formatReps, formatWeightReps } from './uiFormat';
import type { Exercise, MovementIntent } from '@/lib/training/types';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';

interface SetFocusCardProps {
  exercise: Exercise;
  setIndex: number;
  totalSets: number;
  plannedWeight: number;
  plannedReps: number;
  priority?: string;
  intents?: string[];
  autoregMessage?: string | null;
  lastPerformance?: { weight: number; reps: number; date?: string } | null;
  previousSet?: { weight: number; reps: number } | null;
  onDone: (weight: number, reps: number, rpe?: number) => void;
  onSkip: () => void;
  onEdit: () => void;
  onRpeSelect: (rpe: number) => void;
  selectedRpe: number | null;
  isSessionEnded: boolean;
}

export default function SetFocusCard({
  exercise,
  setIndex,
  totalSets,
  plannedWeight,
  plannedReps,
  priority,
  intents,
  autoregMessage,
  lastPerformance,
  previousSet,
  onDone,
  onSkip,
  onEdit,
  onRpeSelect,
  selectedRpe,
  isSessionEnded,
}: SetFocusCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);

  const [weight, setWeight] = useState(plannedWeight);
  const [reps, setReps] = useState(plannedReps);

  useEffect(() => {
    setWeight(plannedWeight);
    setReps(plannedReps);
  }, [plannedWeight, plannedReps, setIndex]);

  const isDumbbell = useMemo(() => {
    const eq = exercise.equipment || [];
    return eq.some((e: string) => e.includes('dumbbell') || e === 'dumbbells');
  }, [exercise.equipment]);

  const weightStep = isDumbbell ? 1 : 2.5;
  const bigStep = isDumbbell ? 5 : 5;

  return (
    <Card
      mode="elevated"
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: appTheme.borderRadius.xl,
        marginBottom: appTheme.spacing.lg,
      }}
    >
      <Card.Content style={{ padding: appTheme.spacing.lg }}>
        {/* Exercise name + set indicator */}
        <Text
          variant="titleLarge"
          style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: 2 }}
          numberOfLines={2}
        >
          {exercise.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: appTheme.spacing.sm, marginBottom: appTheme.spacing.sm }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Set {setIndex} of {totalSets}
          </Text>
          {priority ? (
            <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              {priority}
            </Text>
          ) : null}
        </View>
        {intents && intents.length > 0 ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.md, lineHeight: 18 }}
            numberOfLines={2}
          >
            {getPrimaryIntentLabels(intents as MovementIntent[], 3).join(' · ')}
          </Text>
        ) : null}

        {/* Last session comparison */}
        {previousSet ? (
          <View
            style={{
              padding: appTheme.spacing.sm,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: appTheme.borderRadius.md,
              marginBottom: appTheme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Last session set {setIndex}: {formatWeightReps(previousSet.weight, previousSet.reps)}
            </Text>
          </View>
        ) : lastPerformance ? (
          <View
            style={{
              padding: appTheme.spacing.sm,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: appTheme.borderRadius.md,
              marginBottom: appTheme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Last time: {formatWeightReps(lastPerformance.weight, lastPerformance.reps)}
              {lastPerformance.date
                ? ` · ${new Date(lastPerformance.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : ''}
            </Text>
          </View>
        ) : null}

        {/* Autoregulation message */}
        {autoregMessage ? (
          <View
            style={{
              padding: appTheme.spacing.sm,
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: appTheme.borderRadius.md,
              marginBottom: appTheme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, fontStyle: 'italic' }}>
              💡 {autoregMessage}
            </Text>
          </View>
        ) : null}

        {/* Weight control */}
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
          Weight
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: appTheme.spacing.md, gap: 6 }}>
          <IconButton
            icon="minus"
            mode="outlined"
            size={20}
            onPress={() => setWeight((w) => Math.max(0, w - bigStep))}
            accessibilityLabel={`Decrease weight by ${bigStep}kg`}
          />
          <IconButton
            icon="minus"
            mode="outlined"
            size={16}
            onPress={() => setWeight((w) => Math.max(0, w - weightStep))}
            accessibilityLabel={`Decrease weight by ${weightStep}kg`}
          />
          <View style={{ minWidth: 90, alignItems: 'center' }}>
            <Text variant="headlineMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
              {formatWeight(weight)}
            </Text>
          </View>
          <IconButton
            icon="plus"
            mode="outlined"
            size={16}
            onPress={() => setWeight((w) => w + weightStep)}
            accessibilityLabel={`Increase weight by ${weightStep}kg`}
          />
          <IconButton
            icon="plus"
            mode="outlined"
            size={20}
            onPress={() => setWeight((w) => w + bigStep)}
            accessibilityLabel={`Increase weight by ${bigStep}kg`}
          />
        </View>

        {/* Reps control */}
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
          Reps
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: appTheme.spacing.lg, gap: 6 }}>
          <IconButton
            icon="minus"
            mode="outlined"
            size={20}
            onPress={() => setReps((r) => Math.max(1, r - 1))}
            accessibilityLabel="Decrease reps"
          />
          <View style={{ minWidth: 60, alignItems: 'center' }}>
            <Text variant="headlineMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
              {formatReps(reps)}
            </Text>
          </View>
          <IconButton
            icon="plus"
            mode="outlined"
            size={20}
            onPress={() => setReps((r) => r + 1)}
            accessibilityLabel="Increase reps"
          />
        </View>

        {/* RPE quick select */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: appTheme.spacing.lg }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginRight: 4 }}>RPE</Text>
          {[6, 7, 8, 9, 10].map((rpe) => (
            <Button
              key={rpe}
              mode={selectedRpe === rpe ? 'contained' : 'outlined'}
              compact
              onPress={() => onRpeSelect(selectedRpe === rpe ? 0 : rpe)}
              style={{ minWidth: 0, paddingHorizontal: 0 }}
              labelStyle={{ fontSize: 13, marginHorizontal: 10 }}
              buttonColor={selectedRpe === rpe ? theme.colors.primary : undefined}
              textColor={selectedRpe === rpe ? theme.colors.onPrimary : undefined}
            >
              {rpe}
            </Button>
          ))}
        </View>

        {/* Done button */}
        <Button
          mode="contained"
          onPress={() => onDone(weight, reps, selectedRpe || undefined)}
          disabled={isSessionEnded}
          buttonColor={theme.colors.primary}
          textColor={theme.colors.onPrimary}
          style={[primaryCapsule.style, { marginBottom: appTheme.spacing.sm }]}
          contentStyle={[primaryCapsule.contentStyle, { minHeight: 52 }]}
          labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary, fontSize: 16 }]}
        >
          Done
        </Button>

        {/* Secondary actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: appTheme.spacing.md }}>
          <Button mode="text" compact onPress={onEdit} textColor={theme.colors.onSurfaceVariant}>
            Edit set
          </Button>
          <Button mode="text" compact onPress={onSkip} textColor={theme.colors.onSurfaceVariant}>
            Skip set
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}
