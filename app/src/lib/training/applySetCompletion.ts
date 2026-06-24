/**
 * Canonical persistence for completing one training set (in-app, notification, offline replay).
 */

import { logTrainingSet, logTrainingEvent } from '@/data/TrainingRepository';
import { buildSetLogPayload, buildSetLogQueuePayload } from '@/lib/training/runtime/payloadBuilder';
import { mergePerformedSetsIntoSessionItemFromDb } from '@/lib/training/trainingSetCompletionPersistence';
import { enqueueOperation } from '@/lib/training/offlineQueue';
import { isNetworkAvailable } from '@/lib/training/offlineSync';
import {
  TRAINING_SESSION_BUFFER_WRITES_ENABLED,
  upsertBufferedSessionSetLog,
} from '@/lib/training/sessionWriteBuffer';
import { logger } from '@/lib/logger';

const SET_LOG_RETRY_ATTEMPTS = 3;
const SET_LOG_RETRY_DELAY_MS = 500;

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

async function persistSetLogWithRetry(
  setLogPayload: ReturnType<typeof buildSetLogPayload>,
  exerciseId: string,
  completedAt: string,
): Promise<boolean> {
  let lastError: unknown;
  for (let attempt = 0; attempt < SET_LOG_RETRY_ATTEMPTS; attempt++) {
    try {
      await logTrainingSet({
        id: setLogPayload.id,
        sessionItemId: setLogPayload.sessionItemId,
        setIndex: setLogPayload.setIndex,
        weight: setLogPayload.weight,
        reps: setLogPayload.reps,
        rpe: setLogPayload.rpe !== null ? setLogPayload.rpe : undefined,
        exerciseId,
        completedAt,
      });
      return true;
    } catch (e) {
      lastError = e;
      if (attempt < SET_LOG_RETRY_ATTEMPTS - 1) {
        logger.debug('[applySetCompletion] logTrainingSet retry', {
          attempt: attempt + 1,
          sessionItemId: setLogPayload.sessionItemId,
        });
        await new Promise((r) => setTimeout(r, SET_LOG_RETRY_DELAY_MS));
      }
    }
  }

  const queuePayload = buildSetLogQueuePayload(
    setLogPayload.sessionItemId,
    exerciseId,
    setLogPayload.setIndex,
    setLogPayload.weight,
    setLogPayload.reps,
    setLogPayload.rpe,
  );
  await enqueueOperation({ ...queuePayload, id: setLogPayload.id } as Parameters<typeof enqueueOperation>[0]);
  logger.warn('[applySetCompletion] logTrainingSet failed, enqueued for sync', {
    sessionItemId: setLogPayload.sessionItemId,
    error: lastError,
  });
  return false;
}

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
      wroteOnline = await persistSetLogWithRetry(setLogPayload, input.exerciseId, completedAt);
    }

    if (wroteOnline) {
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
    }
  } else {
    const queuePayload = buildSetLogQueuePayload(
      input.sessionItemId,
      input.exerciseId,
      input.setIndex,
      input.weight,
      input.reps,
      input.rpe,
    );
    await enqueueOperation({ ...queuePayload, id: setLogPayload.id } as Parameters<typeof enqueueOperation>[0]);
    await logTrainingEvent('training_offline_queue_used', {
      operation: 'insertSetLog',
    }).catch((e) => {
      if (__DEV__) logger.debug('[applySetCompletion]', e);
    });
  }

  return { wroteOnline, completedAt, setLogId: setLogPayload.id };
}

/** Skip one set — same DB contract as in-app skip (zero weight/reps log + performed merge). */
export async function applySetSkip(
  input: Omit<ApplySetCompletionInput, 'weight' | 'reps' | 'rpe'>,
): Promise<ApplySetCompletionResult> {
  const result = await applySetCompletion({
    ...input,
    weight: 0,
    reps: 0,
  });
  await logTrainingEvent('training_set_skipped', {
    exerciseId: input.exerciseId,
    sessionId: input.sessionId,
    setIndex: input.setIndex,
  }).catch((e) => {
    if (__DEV__) logger.debug('[applySetSkip]', e);
  });
  return result;
}
