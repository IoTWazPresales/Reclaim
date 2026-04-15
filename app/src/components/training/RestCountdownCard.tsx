/**
 * RestCountdownCard — Full-card rest countdown view.
 * Shown in place of SetFocusCard during rest periods.
 * Shows circular-style countdown, next set preview, and skip/extend controls.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Button, Card, Text, ProgressBar, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { formatWeight, formatReps } from './uiFormat';

interface RestCountdownCardProps {
  totalSeconds: number;
  remainingSeconds: number;
  isPaused: boolean;
  nextExerciseName: string;
  nextSetIndex: number;
  nextTotalSets: number;
  nextWeight: number;
  nextReps: number;
  isNewExercise: boolean;
  onSkipRest: () => void;
  onExtend: (seconds: number) => void;
  onTogglePause: () => void;
}

export default function RestCountdownCard({
  totalSeconds,
  remainingSeconds,
  isPaused,
  nextExerciseName,
  nextSetIndex,
  nextTotalSets,
  nextWeight,
  nextReps,
  isNewExercise,
  onSkipRest,
  onExtend,
  onTogglePause,
}: RestCountdownCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 1;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <Card
      mode="elevated"
      style={{
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: appTheme.borderRadius.xl,
        marginBottom: appTheme.spacing.lg,
      }}
    >
      <Card.Content style={{ padding: appTheme.spacing.lg }}>
        <Text
          variant="titleMedium"
          style={{ fontWeight: '700', color: theme.colors.onSecondaryContainer, textAlign: 'center', marginBottom: appTheme.spacing.xs }}
        >
          REST
        </Text>

        {/* Large countdown */}
        <Text
          variant="displaySmall"
          style={{
            fontWeight: '700',
            color: theme.colors.onSecondaryContainer,
            textAlign: 'center',
            marginBottom: appTheme.spacing.md,
            fontVariant: ['tabular-nums'],
          }}
        >
          {timeStr}
        </Text>

        <ProgressBar
          progress={progress}
          color={theme.colors.primary}
          style={{
            height: 8,
            borderRadius: 4,
            marginBottom: appTheme.spacing.lg,
            backgroundColor: theme.colors.surfaceVariant,
          }}
        />

        {/* Next set preview */}
        <View
          style={{
            padding: appTheme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: appTheme.borderRadius.lg,
            marginBottom: appTheme.spacing.lg,
          }}
        >
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {isNewExercise ? 'Next exercise' : 'After rest'}
          </Text>
          <Text variant="bodyLarge" style={{ fontWeight: '700', color: theme.colors.onSurface }} numberOfLines={1}>
            {nextExerciseName}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            Set {nextSetIndex} of {nextTotalSets} · {formatWeight(nextWeight)} {formatReps(nextReps)}
          </Text>
        </View>

        {/* Controls */}
        <View style={{ flexDirection: 'row', gap: appTheme.spacing.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            mode="outlined"
            compact
            icon={isPaused ? 'play' : 'pause'}
            onPress={onTogglePause}
            textColor={theme.colors.onSecondaryContainer}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            mode="outlined"
            compact
            onPress={() => onExtend(30)}
            textColor={theme.colors.onSecondaryContainer}
          >
            +30s
          </Button>
          <Button
            mode="contained"
            compact
            onPress={onSkipRest}
          >
            Skip Rest
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}
