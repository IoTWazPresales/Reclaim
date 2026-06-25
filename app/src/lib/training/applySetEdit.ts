/**
 * Canonical persistence for editing an already-logged training set.
 */

import { getTrainingSessionItemById, updateTrainingSetLog } from '@/data/TrainingRepository';
import { mergePerformedSetsIntoSessionItemFromDb } from '@/lib/training/trainingSetCompletionPersistence';
import { enqueueOperation } from '@/lib/training/offlineQueue';
import { isNetworkAvailable } from '@/lib/training/offlineSync';
import { mergePerformedSetSlices } from '@/lib/training/trainingSetCompletionMerge';
import { applySetCompletion } from '@/lib/training/applySetCompletion';
import { logger } from '@/lib/logger';

export type ApplySetEditInput = {
  sessionId: string;
  sessionItemId: string;
  exerciseId: string;
  setIndex: number;
  setLogId: string;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt: string;
};

export type ApplySetEditResult = {
  wroteOnline: boolean;
  createdNewLog: boolean;
};

export async function applySetEdit(input: ApplySetEditInput): Promise<ApplySetEditResult> {
  if (!input.setLogId) {
    await applySetCompletion({
      sessionId: input.sessionId,
      sessionItemId: input.sessionItemId,
      exerciseId: input.exerciseId,
      setIndex: input.setIndex,
      weight: input.weight,
      reps: input.reps,
      rpe: input.rpe,
      completedAt: input.completedAt,
    });
    return { wroteOnline: true, createdNewLog: true };
  }

  const performedSlice = {
    setIndex: input.setIndex,
    weight: input.weight,
    reps: input.reps,
    rpe: input.rpe,
    completedAt: input.completedAt,
  };

  const networkAvailable = await isNetworkAvailable();

  if (networkAvailable) {
    await updateTrainingSetLog(input.setLogId, {
      weight: input.weight,
      reps: input.reps,
      rpe: input.rpe !== undefined ? input.rpe : null,
    });
    await mergePerformedSetsIntoSessionItemFromDb(input.sessionItemId, [performedSlice]);
    return { wroteOnline: true, createdNewLog: false };
  }

  const item = await getTrainingSessionItemById(input.sessionItemId);
  const existing = (item?.performed?.sets ?? []) as typeof performedSlice[];
  const merged = mergePerformedSetSlices(existing, [performedSlice]);
  await enqueueOperation({
    type: 'upsertItem',
    sessionId: input.sessionId,
    itemId: input.sessionItemId,
    payload: { performed: { sets: merged } },
    timestamp: new Date().toISOString(),
  });
  logger.debug('[applySetEdit] queued performed update offline', {
    sessionItemId: input.sessionItemId,
    setIndex: input.setIndex,
  });
  return { wroteOnline: false, createdNewLog: false };
}
