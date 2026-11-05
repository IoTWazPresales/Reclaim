/**
 * Weekly policy v5 realistic session estimate (ROUTINE_AUDIT.md, weekly policy
 * v5 2026-11-05, V5-5). Display only: it never trims sets and never warns.
 * Per exercise: warm-up sets x warm-up time, working sets x (reps x seconds per
 * rep + set-up), doubled when reps are counted per side, (sets - 1) x rest, and
 * one transition. Constants live in V5_DURATION_ESTIMATE.
 */
import { V5_DURATION_ESTIMATE } from './weeklyProgrammePolicy';
import type { PlannedExercise } from './types';

export function estimateExerciseSeconds(item: Pick<PlannedExercise, 'exercise' | 'plannedSets' | 'warmupSets'>): number {
  const constants = V5_DURATION_ESTIMATE;
  const sides = item.exercise.repsPerSide ? constants.unilateralWorkMultiplier : 1;
  const warmups = (item.warmupSets?.length ?? 0) * constants.warmupSetSeconds;
  const work = item.plannedSets.reduce((total, set) => total + (set.targetReps * constants.secondsPerRep + constants.setSetupSeconds) * sides, 0);
  const rest = item.plannedSets.slice(0, -1).reduce((total, set) => total + set.restSeconds, 0);
  return warmups + work + rest + constants.transitionSeconds;
}

/** Whole minutes, at least one when the session has work; zero for an empty session. */
export function estimateSessionMinutes(items: ReadonlyArray<Pick<PlannedExercise, 'exercise' | 'plannedSets' | 'warmupSets'>>): number {
  if (!items.length) return 0;
  const seconds = items.reduce((total, item) => total + estimateExerciseSeconds(item), 0);
  return Math.max(1, Math.round(seconds / 60));
}
