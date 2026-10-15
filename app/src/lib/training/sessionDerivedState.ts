import type { TrainingSessionItemRow } from '@/lib/api';
import {
  getLoggedSetIndices,
  isExerciseFullyLoggedOnItem,
} from '@/lib/training/sessionWorkAuthority';

export type LocalAdjustments = Record<
  string,
  Record<number, { weightDelta: number; repsDelta: number; reason: string }>
>;

/** @deprecated Removed — DB `performed.sets` is the only authority. */
export type OptimisticPerformedSets = Record<string, never>;

export function getEffectiveLoggedSetIndices(item: TrainingSessionItemRow): number[] {
  return getLoggedSetIndices(item);
}

export function isExerciseFullyLoggedForItem(item: TrainingSessionItemRow): boolean {
  return isExerciseFullyLoggedOnItem(item);
}

export function getAdjustedSetParams(
  item: TrainingSessionItemRow,
  setIndex: number,
  localAdjustments: LocalAdjustments,
): { weight: number; reps: number; autoregMessage?: string } {
  const planned = item.planned?.sets?.find((s) => s.setIndex === setIndex);
  const baseWeight = planned?.suggestedWeight ?? 0;
  const baseReps = planned?.targetReps ?? 0;

  // Past completion is immutable history; overlays only describe pending work.
  if (!planned || getLoggedSetIndices(item).includes(setIndex)) {
    return { weight: baseWeight, reps: baseReps };
  }
  const adjustment = localAdjustments[item.id]?.[setIndex] ?? item.autoregulation_adjustments?.[setIndex];
  if (adjustment) {
    const weight = baseWeight + adjustment.weightDelta;
    const reps = baseReps + adjustment.repsDelta;
    if (!Number.isFinite(adjustment.weightDelta) || !Number.isFinite(adjustment.repsDelta) ||
        !Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 1) {
      return { weight: baseWeight, reps: baseReps, autoregMessage: 'No adjustment applied: the saved adjustment is invalid.' };
    }
    return {
      weight,
      reps,
      autoregMessage: adjustment.reason,
    };
  }

  return { weight: baseWeight, reps: baseReps };
}

export function deriveElapsedSeconds(startedAt: string | null): number {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
}

export function deriveSessionStatus(endedAt: string | null): 'active' | 'completed' {
  return endedAt === null ? 'active' : 'completed';
}

export function computeSessionSummaryFromItems(
  items: TrainingSessionItemRow[],
  startedAt: string | null,
  endedAtIso: string,
): {
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  exerciseSummaries: Array<{
    exerciseId: string;
    setsCompleted: number;
    totalReps: number;
    totalVolume: number;
  }>;
  elapsedSeconds: number;
} {
  const elapsedSeconds = startedAt
    ? Math.floor((new Date(endedAtIso).getTime() - new Date(startedAt).getTime()) / 1000)
    : 0;

  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  const exerciseSummaries = items.map((item) => {
    const sets = item.performed?.sets ?? [];
    const setsCompleted = sets.length;
    const itemReps = sets.reduce((sum, s) => sum + s.reps, 0);
    const itemVolume = sets.reduce((sum, s) => sum + (s.weight ?? 0) * s.reps, 0);
    totalSets += setsCompleted;
    totalReps += itemReps;
    totalVolume += itemVolume;
    return {
      exerciseId: item.exercise_id,
      setsCompleted,
      totalReps: itemReps,
      totalVolume: itemVolume,
    };
  });

  return { totalSets, totalReps, totalVolume, exerciseSummaries, elapsedSeconds };
}
