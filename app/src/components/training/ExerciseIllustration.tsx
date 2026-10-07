/**
 * Exercise how-to figure.
 * Mapped lifts load the public Everkinetic still. A missing file or a failed
 * load falls back to the stick position guide.
 */
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { MovementIntent } from '@/lib/training/types';
import { resolveExerciseIllustrationUrl } from '@/lib/training/exerciseIllustration';
import HumanFormDiagram from './HumanFormDiagram';

type Props = {
  exerciseId: string;
  exerciseName?: string | null;
  intents: MovementIntent[];
  size?: number;
};

export default function ExerciseIllustration({
  exerciseId,
  exerciseName,
  intents,
  size = 200,
}: Props) {
  const theme = useTheme();
  const url = resolveExerciseIllustrationUrl(exerciseId);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [exerciseId, url]);

  const showStill = Boolean(url) && !failed;
  const label = exerciseName?.trim() || 'Exercise';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 8, minHeight: size }}>
      {showStill ? (
        <Image
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${label} illustration`}
          source={{ uri: url! }}
          style={{ width: size, height: size }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <HumanFormDiagram
          exerciseId={exerciseId}
          exerciseName={exerciseName}
          intents={intents}
          size={size}
        />
      )}
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}
      >
        {showStill
          ? 'Everkinetic illustration'
          : 'Position guide. No drawing is available for this exercise.'}
      </Text>
    </View>
  );
}
