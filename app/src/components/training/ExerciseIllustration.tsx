/**
 * Remote stills are deferred (Everkinetic quality). Animated human form is primary.
 */
import React from 'react';
import { View } from 'react-native';
import type { MovementIntent } from '@/lib/training/types';
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
  size = 160,
}: Props) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 8, minHeight: size }}>
      <HumanFormDiagram
        exerciseId={exerciseId}
        exerciseName={exerciseName}
        intents={intents}
        size={size}
      />
    </View>
  );
}
