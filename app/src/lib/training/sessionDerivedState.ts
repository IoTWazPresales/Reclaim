import type { TrainingSessionItemRow } from '@/lib/api';

export type OptimisticPerformedSets = Record<
  string,
  Array<{ setIndex: number; weight: number; reps: number; rpe?: number; completedAt: string }>
>;

export type LocalAdjustments = Record<
  string,
  Record<number, { weightDelta: number; repsDelta: number; reason: string }>
>;

export function getEffectiveLoggedSetIndices(
  item: TrainingSessionItemRow,
  optimisticPerformedSets: OptimisticPerformedSets
): number[] {
  const dbSets = item.performed?.sets ?? [];
  const optimistic = optimisticPerformedSets[item.id] ?? [];
  const merged = new Set<number>(dbSets.map(s => s.setIndex));
  optimistic.forEach(s => merged.add(s.setIndex));
  return Array.from(merged).sort((a, b) => a - b);
}

export function isExerciseFullyLoggedForItem(
  item: TrainingSessionItemRow,
  optimisticPerformedSets: OptimisticPerformedSets
): boolean {
  const logged = getEffectiveLoggedSetIndices(item, optimisticPerformedSets);
  return logged.length >= (item.planned?.sets?.length ?? 0);
}

export function getNextSetIndex(
  item: TrainingSessionItemRow,
  optimisticPerformedSets: OptimisticPerformedSets
): number {
  const logged = getEffectiveLoggedSetIndices(item, optimisticPerformedSets);
  return logged.length + 1;
}

export function getAdjustedSetParams(
  item: TrainingSessionItemRow,
  setIndex: number,
  localAdjustments: LocalAdjustments
): { weight: number; reps: number; autoregMessage?: string } {
  const planned = item.planned?.sets?.find(s => s.setIndex === setIndex);
  const baseWeight = planned?.suggestedWeight ?? 0;
  const baseReps = planned?.targetReps ?? 0;

  const localAdj = localAdjustments[item.id]?.[setIndex];
  if (localAdj) {
    return {
      weight: baseWeight + localAdj.weightDelta,
      reps: baseReps + localAdj.repsDelta,
      autoregMessage: localAdj.reason,
    };
  }

  const dbAdj = item.autoregulation_adjustments?.[setIndex];
  if (dbAdj) {
    return {
      weight: baseWeight + dbAdj.weightDelta,
      reps: baseReps + dbAdj.repsDelta,
      autoregMessage: dbAdj.reason,
    };
  }

  return { weight: baseWeight, reps: baseReps };
}

export function deriveElapsedSeconds(startedAt: string | null): number {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
}

export function deriveSessionStatus(
  endedAt: string | null
): 'active' | 'completed' {
  return endedAt === null ? 'active' : 'completed';
}

export function computeSessionSummaryFromItems(
  items: TrainingSessionItemRow[],
  startedAt: string | null,
  endedAtIso: string
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
  const exerciseSummaries = items.map(item => {
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
