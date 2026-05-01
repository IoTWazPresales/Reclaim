/**
 * Canonical persistence for "set completed" — keep training_set_logs and
 * training_session_items.performed aligned so in-app, notification, and
 * offline replay paths do not diverge.
 */

import { logger } from '@/lib/logger';
import { getTrainingSessionItemById, updateTrainingSessionItem } from '@/data/TrainingRepository';

export type PerformedSetSnapshot = {
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt: string;
};

/** Merge by setIndex; later entries in `incoming` win over `existing`. */
export function mergePerformedSetSlices(
  existing: PerformedSetSnapshot[] | null | undefined,
  incoming: PerformedSetSnapshot[],
): PerformedSetSnapshot[] {
  const byIndex = new Map<number, PerformedSetSnapshot>();
  for (const s of existing ?? []) {
    byIndex.set(s.setIndex, { ...s });
  }
  for (const s of incoming) {
    byIndex.set(s.setIndex, { ...s });
  }
  return [...byIndex.values()].sort((a, b) => a.setIndex - b.setIndex);
}

/** Full replace of performed.sets for this item (runtime is authoritative in-app). */
export async function replacePerformedSetsForSessionItem(
  sessionItemId: string,
  sets: PerformedSetSnapshot[],
): Promise<void> {
  const ordered = [...sets].sort((a, b) => a.setIndex - b.setIndex);
  await updateTrainingSessionItem(sessionItemId, {
    performed: { sets: ordered },
  });
}

/**
 * Read-modify-write performed on the server, merging `incoming` by setIndex.
 * Use after a set log row exists (external / single-set paths).
 */
export async function mergePerformedSetsIntoSessionItemFromDb(
  sessionItemId: string,
  incoming: PerformedSetSnapshot[],
): Promise<void> {
  const item = await getTrainingSessionItemById(sessionItemId);
  if (!item) {
    logger.warn('[SET_COMPLETION] merge performed skipped — session item not found', { sessionItemId });
    return;
  }
  const existing = (item.performed?.sets ?? []) as PerformedSetSnapshot[];
  const merged = mergePerformedSetSlices(existing, incoming);
  await updateTrainingSessionItem(sessionItemId, {
    performed: { sets: merged },
  });
}
