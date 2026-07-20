/**
 * Remote still with stick-diagram fallback (Layer 2 — zero APK media).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import type { MovementIntent } from '@/lib/training/types';
import { resolveExerciseIllustrationUrl } from '@/lib/training/exerciseIllustration';
import MovementPatternDiagram from './MovementPatternDiagram';

type Props = {
  exerciseId: string;
  exerciseName?: string | null;
  intents: MovementIntent[];
  size?: number;
};

/** In-memory: don't hammer a known-missing still across modal opens. */
const failedUrls = new Set<string>();

export default function ExerciseIllustration({
  exerciseId,
  exerciseName,
  intents,
  size = 160,
}: Props) {
  const remoteUrl = resolveExerciseIllustrationUrl(exerciseId);
  const [showRemote, setShowRemote] = useState(() =>
    Boolean(remoteUrl && !failedUrls.has(remoteUrl)),
  );

  useEffect(() => {
    const url = resolveExerciseIllustrationUrl(exerciseId);
    setShowRemote(Boolean(url && !failedUrls.has(url)));
  }, [exerciseId]);

  const onError = useCallback(() => {
    if (remoteUrl) failedUrls.add(remoteUrl);
    setShowRemote(false);
  }, [remoteUrl]);

  if (showRemote && remoteUrl) {
    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginVertical: 8,
          minHeight: size,
        }}
      >
        <Image
          source={{ uri: remoteUrl }}
          style={{ width: size, height: size, borderRadius: 12 }}
          resizeMode="contain"
          accessibilityLabel={`${exerciseName ?? exerciseId} form illustration`}
          onError={onError}
        />
      </View>
    );
  }

  return (
    <MovementPatternDiagram
      intents={intents}
      exerciseName={exerciseName}
      exerciseId={exerciseId}
      size={Math.min(size, 120)}
    />
  );
}
