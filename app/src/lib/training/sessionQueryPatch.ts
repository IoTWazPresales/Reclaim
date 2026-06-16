/**
 * React Query cache patches for training session — the only UI-speed layer (not a second authority).
 * Patches must mirror what applySetCompletion writes to the DB.
 */

import type { QueryClient } from '@tanstack/react-query';
import type { TrainingSessionItemRow, TrainingSessionRow } from '@/lib/api';
import { mergePerformedSetSlices, type PerformedSetSnapshot } from '@/lib/training/trainingSetCompletionMerge';

export type TrainingSessionQueryData = {
  session: TrainingSessionRow;
  items: TrainingSessionItemRow[];
};

export const trainingSessionQueryKey = (sessionId: string) =>
  ['training:session', sessionId] as const;

export function patchSessionQuery(
  qc: QueryClient,
  sessionId: string,
  updater: (prev: TrainingSessionQueryData) => TrainingSessionQueryData,
): void {
  qc.setQueryData<TrainingSessionQueryData>(trainingSessionQueryKey(sessionId), (prev) => {
    if (!prev) return prev;
    return updater(prev);
  });
}

export function patchSessionItemPerformedInCache(
  qc: QueryClient,
  sessionId: string,
  sessionItemId: string,
  incoming: PerformedSetSnapshot,
): void {
  patchSessionQuery(qc, sessionId, (prev) => ({
    ...prev,
    items: prev.items.map((item) => {
      if (item.id !== sessionItemId) return item;
      const merged = mergePerformedSetSlices(item.performed?.sets ?? [], [incoming]);
      return {
        ...item,
        performed: { sets: merged },
      };
    }),
  }));
}

export function patchSessionCursorInCache(
  qc: QueryClient,
  sessionId: string,
  updates: Partial<
    Pick<TrainingSessionRow, 'current_exercise_index' | 'phase' | 'rest_started_at' | 'rest_ends_at'>
  >,
): void {
  patchSessionQuery(qc, sessionId, (prev) => ({
    ...prev,
    session: { ...prev.session, ...updates },
  }));
}
