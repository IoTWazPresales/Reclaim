/**
 * Canonical persistence for completing one training set (in-app, notification, offline replay).
 */

import { logTrainingSet } from '@/data/TrainingRepository';
import { logTrainingEvent } from '@/data/TrainingRepository';
import { buildSetLogPayload, buildSetLogQueuePayload } from '@/lib/training/runtime/payloadBuilder';
import { mergePerformedSetsIntoSessionItemFromDb } from '@/lib/training/trainingSetCompletionPersistence';
import { enqueueOperation } from '@/lib/training/offlineQueue';
import { isNetworkAvailable } from '@/lib/training/offlineSync';
import {
  TRAINING_SESSION_BUFFER_WRITES_ENABLED,
  upsertBufferedSessionSetLog,
} from '@/lib/training/sessionWriteBuffer';
import { logger } from '@/lib/logger';

export type ApplySetCompletionInput = {
  sessionId: string;
  sessionItemId: string;
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt?: string;
};

export type ApplySetCompletionResult = {
  wroteOnline: boolean;
  completedAt: string;
  setLogId: string;
};

export async function applySetCompletion(
  input: ApplySetCompletionInput,
): Promise<ApplySetCompletionResult> {
  const completedAt = input.completedAt ?? new Date().toISOString();
  const setLogPayload = buildSetLogPayload(
    input.sessionItemId,
    input.sessionId,
    input.exerciseId,
    input.setIndex,
    input.weight,
    input.reps,
    input.rpe,
    completedAt,
  );

  const performedSlice = {
    setIndex: setLogPayload.setIndex,
    weight: setLogPayload.weight,
    reps: setLogPayload.reps,
    rpe: setLogPayload.rpe ?? undefined,
    completedAt,
  };

  const networkAvailable = await isNetworkAvailable();
  let wroteOnline = false;

  if (networkAvailable) {
    if (TRAINING_SESSION_BUFFER_WRITES_ENABLED) {
      await upsertBufferedSessionSetLog({
        id: setLogPayload.id,
        sessionId: input.sessionId,
        sessionItemId: setLogPayload.sessionItemId,
        exerciseId: setLogPayload.exerciseId,
        setIndex: setLogPayload.setIndex,
        weight: setLogPayload.weight,
        reps: setLogPayload.reps,
        rpe: setLogPayload.rpe !== null ? setLogPayload.rpe : undefined,
        completedAt,
      });
      wroteOnline = true;
    } else {
      await logTrainingSet({
        id: setLogPayload.id,
        sessionItemId: setLogPayload.sessionItemId,
        setIndex: setLogPayload.setIndex,
        weight: setLogPayload.weight,
        reps: setLogPayload.reps,
        rpe: setLogPayload.rpe !== null ? setLogPayload.rpe : undefined,
        exerciseId: setLogPayload.exerciseId,
      });
      wroteOnline = true;
    }

    await mergePerformedSetsIntoSessionItemFromDb(input.sessionItemId, [performedSlice]);
    await logTrainingEvent('training_set_logged', {
      exerciseId: setLogPayload.exerciseId,
      setIndex: setLogPayload.setIndex,
      weight: setLogPayload.weight,
      reps: setLogPayload.reps,
      rpe: setLogPayload.rpe,
    }).catch((e) => {
      if (__DEV__) logger.debug('[applySetCompletion]', e);
    });
  } else {
    const queuePayload = buildSetLogQueuePayload(
      input.sessionItemId,
      input.exerciseId,
      input.setIndex,
      input.weight,
      input.reps,
      input.rpe,
    );
    await enqueueOperation(queuePayload);
    await logTrainingEvent('training_offline_queue_used', {
      operation: 'insertSetLog',
    }).catch((e) => {
      if (__DEV__) logger.debug('[applySetCompletion]', e);
    });
  }

  return { wroteOnline, completedAt, setLogId: setLogPayload.id };
}
