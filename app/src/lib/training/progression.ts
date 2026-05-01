// Progression Engine - e1RM estimation, double progression, autoregulation
import type { Exercise, SetLog, ExercisePerformance, MovementIntent } from './types';

/**
 * Estimate 1RM using Epley formula
 * 1RM = weight × (1 + reps/30)
 */
export function estimate1RMEpley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Estimate 1RM using Brzycki formula
 * 1RM = weight × (36 / (37 - reps))
 */
export function estimate1RMBrzycki(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps >= 37) return weight; // Formula breaks down at high reps
  return weight * (36 / (37 - reps));
}

/**
 * Default: Use Epley (more conservative for higher rep ranges)
 */
export function estimate1RM(weight: number, reps: number): number {
  return estimate1RMEpley(weight, reps);
}

/**
 * Compute e1RM from best set in performance data
 * Best = highest e1RM across all sets
 */
export function computeE1RMFromPerformance(performance: ExercisePerformance): number {
  if (!performance.sets || performance.sets.length === 0) return 0;

  const e1RMs = performance.sets
    .map((set) => estimate1RM(set.weight, set.reps))
    .filter((rm) => rm > 0);

  if (e1RMs.length === 0) return 0;
  return Math.max(...e1RMs);
}

/**
 * Compute e1RM for an exercise from last session performance
 */
export function getExerciseE1RM(
  exerciseId: string,
  lastPerformance?: Record<string, ExercisePerformance>,
): number {
  if (!lastPerformance?.[exerciseId]) return 0;
  return computeE1RMFromPerformance(lastPerformance[exerciseId]);
}

/**
 * Get weight step for exercise based on movement pattern
 */
export function getWeightStep(exercise: Exercise): number {
  // Check for override in exercise notes or catalog (future: add to catalog)
  // For now, use defaults based on movement pattern

  const lowerBodyIntents: MovementIntent[] = ['knee_dominant', 'hip_hinge'];
  const isLowerBody = exercise.intents.some((i) => lowerBodyIntents.includes(i));

  // Lower body: 5kg steps
  // Upper body: 2.5kg steps
  return isLowerBody ? 5 : 2.5;
}

/**
 * Get minimum weight for exercise (empty bar/dumbbell minimum)
 */
export function getMinimumWeight(exercise: Exercise): number {
  // Bodyweight exercises
  if (exercise.equipment.length === 0) return 0;

  // Barbell exercises
  if (exercise.equipment.includes('barbell')) return 20; // empty bar

  // Dumbbell exercises
  if (exercise.equipment.includes('dumbbells')) return 2.5; // smallest plate

  // Machine exercises
  if (exercise.equipment.some((e) => e.includes('machine'))) return 5;

  // Default
  return 2.5;
}

/**
 * Determine if user hit progression criteria
 * Returns: 'increase' | 'maintain' | 'decrease' | 'reduce_sets'
 */
export function evaluateProgression(
  plannedSets: Array<{ targetReps: number; suggestedWeight: number }>,
  performedSets: Array<{ weight: number; reps: number; rpe?: number }>,
  repRange: [number, number],
  rpeCap: number = 8,
): 'increase' | 'maintain' | 'decrease' | 'reduce_sets' {
  if (performedSets.length === 0) return 'maintain';

  const [minReps, maxReps] = repRange;

  // Check if all sets hit top of range at acceptable RPE
  const allHitTop = performedSets.every((set) => {
    const hitTop = set.reps >= maxReps;
    const rpeOk = !set.rpe || set.rpe <= rpeCap;
    return hitTop && rpeOk;
  });

  if (allHitTop) {
    return 'increase';
  }

  // Check for failures (missed minimum reps or very high RPE early)
  const hasFailure = performedSets.some((set, idx) => {
    if (idx === 0 && set.reps < minReps) return true; // First set failure
    if (set.rpe && set.rpe >= 9 && idx < performedSets.length - 1) return true; // High RPE early
    return false;
  });

  if (hasFailure) {
    // If multiple sets failed, reduce sets; otherwise decrease weight
    const failureCount = performedSets.filter((s) => s.reps < minReps).length;
    return failureCount >= 2 ? 'reduce_sets' : 'decrease';
  }

  return 'maintain';
}

/**
 * Calculate next weight with guardrails
 */
export function calculateNextWeight(
  currentWeight: number,
  progression: 'increase' | 'maintain' | 'decrease',
  exercise: Exercise,
  maxIncreasePercent: number = 0.1,
): number {
  const step = getWeightStep(exercise);
  const minWeight = getMinimumWeight(exercise);

  if (progression === 'increase') {
    const next = currentWeight + step;
    // Guardrail: never increase more than maxIncreasePercent
    const maxIncrease = currentWeight * (1 + maxIncreasePercent);
    return Math.min(next, Math.round(maxIncrease / step) * step);
  }

  if (progression === 'decrease') {
    const next = currentWeight - step;
    return Math.max(next, minWeight);
  }

  return currentWeight;
}

/**
 * Calculate next rep target with double progression
 */
export function calculateNextReps(
  currentReps: number,
  repRange: [number, number],
  progression: 'increase' | 'maintain' | 'decrease',
): number {
  const [minReps, maxReps] = repRange;

  if (progression === 'increase') {
    // If at top of range, stay at top (weight will increase)
    if (currentReps >= maxReps) {
      return maxReps;
    }
    // Otherwise, add 1 rep
    return Math.min(currentReps + 1, maxReps);
  }

  if (progression === 'decrease') {
    // Drop to minimum of range
    return minReps;
  }

  return currentReps;
}

/**
 * Detect fatigue in session
 * Returns fatigue level: 0 (none) to 1 (severe)
 */
export function detectFatigue(
  exerciseId: string,
  sets: Array<{ weight: number; reps: number; rpe?: number }>,
): number {
  if (sets.length < 2) return 0;

  // Rising RPE
  const rpeRising = sets
    .map((s) => s.rpe || 5)
    .some((rpe, idx) => idx > 0 && rpe > (sets[idx - 1].rpe || 5) + 1);

  // Missed reps
  const missedReps = sets.some((s, idx) => {
    if (idx === 0) return false;
    const prev = sets[idx - 1];
    return s.weight === prev.weight && s.reps < prev.reps - 1;
  });

  // Large drop in reps at same weight
  const largeDrop = sets.some((s, idx) => {
    if (idx === 0) return false;
    const prev = sets[idx - 1];
    return s.weight === prev.weight && s.reps < prev.reps * 0.8;
  });

  if (largeDrop || (rpeRising && missedReps)) return 0.8;
  if (rpeRising || missedReps) return 0.5;
  return 0;
}

/**
 * Detect PRs from session
 */
export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  metric: 'weight' | 'reps' | 'e1rm' | 'volume';
  value: number;
  previousValue?: number;
  date: string;
}

export function detectPRs(
  exerciseId: string,
  exerciseName: string,
  performedSets: Array<{ weight: number; reps: number }>,
  previousBest?: {
    bestWeight?: number;
    bestReps?: number;
    bestE1RM?: number;
    bestVolume?: number;
  },
): PersonalRecord[] {
  const prs: PersonalRecord[] = [];
  const now = new Date().toISOString();

  if (performedSets.length === 0) return prs;

  // Best set
  const bestSet = performedSets.reduce((best, set) => {
    const e1rm = estimate1RM(set.weight, set.reps);
    const bestE1rm = estimate1RM(best.weight, best.reps);
    return e1rm > bestE1rm ? set : best;
  }, performedSets[0]);

  // Weight PR
  if (!previousBest?.bestWeight || bestSet.weight > previousBest.bestWeight) {
    prs.push({
      exerciseId,
      exerciseName,
      metric: 'weight',
      value: bestSet.weight,
      previousValue: previousBest?.bestWeight,
      date: now,
    });
  }

  // Rep PR at same or higher weight
  const sameWeightSets = performedSets.filter((s) => s.weight >= (previousBest?.bestWeight || 0));
  if (sameWeightSets.length > 0) {
    const maxReps = Math.max(...sameWeightSets.map((s) => s.reps));
    if (!previousBest?.bestReps || maxReps > previousBest.bestReps) {
      prs.push({
        exerciseId,
        exerciseName,
        metric: 'reps',
        value: maxReps,
        previousValue: previousBest?.bestReps,
        date: now,
      });
    }
  }

  // e1RM PR
  const currentE1RM = estimate1RM(bestSet.weight, bestSet.reps);
  if (!previousBest?.bestE1RM || currentE1RM > previousBest.bestE1RM) {
    prs.push({
      exerciseId,
      exerciseName,
      metric: 'e1rm',
      value: Math.round(currentE1RM * 10) / 10,
      previousValue: previousBest?.bestE1RM,
      date: now,
    });
  }

  // Volume PR (total weight × reps)
  const totalVolume = performedSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
  if (!previousBest?.bestVolume || totalVolume > previousBest.bestVolume) {
    prs.push({
      exerciseId,
      exerciseName,
      metric: 'volume',
      value: Math.round(totalVolume),
      previousValue: previousBest?.bestVolume,
      date: now,
    });
  }

  return prs;
}
