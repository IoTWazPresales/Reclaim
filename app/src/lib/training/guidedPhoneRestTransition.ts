/**
 * Pure helpers for phone guided-training rest transitions (in-app rest timer + notification scheduling).
 * Keeps “enter rest immediately after Done” decisions testable without mounting TrainingSessionView.
 */

import { getAdjustedRestTime } from '@/lib/training/runtime/autoregulation';

export type PlannedSetWithRest = {
  setIndex: number;
  restSeconds?: number;
};

/**
 * If completing `completedSetIndex` should start an in-app rest period, returns adjusted rest timing.
 * Otherwise null (no rest before next work — e.g. last set of exercise with no restSeconds).
 */
export function resolveRestPeriodAfterCompletingSet(
  plannedSets: PlannedSetWithRest[],
  completedSetIndex: number,
  rpe: number | undefined,
): { restSeconds: number; adjustment: 'normal' | 'extended' | 'shortened'; message: string } | null {
  if (!plannedSets.length) return null;
  const plannedSet = plannedSets.find((s) => s.setIndex === completedSetIndex);
  if (!plannedSet?.restSeconds || plannedSet.restSeconds <= 0) return null;
  return getAdjustedRestTime(plannedSet.restSeconds, rpe);
}
