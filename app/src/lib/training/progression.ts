// Progression Engine - e1RM estimation, double progression + RPE, autoregulation
import type { Exercise, SetLog, ExercisePerformance, MovementIntent, UserState, PrescriptionContext, ExercisePriority, GoalWeights, TrainingGoal } from './types';
import rules from './rules/rules.v1.json';
import { getExerciseIncrementKg, getExerciseLoadingProfile } from './exerciseLoadingProfile';
import { isQualifiedPerformance, performanceHistorySignature, PERFORMANCE_HISTORY_SOURCE } from './performanceHistory';

export const DOUBLE_PROGRESSION_POLICY_VERSION = 'double-20261103' as const;
export function prescriptionContext(repRange: [number, number]): PrescriptionContext {
  return { policyVersion: DOUBLE_PROGRESSION_POLICY_VERSION, repRange: [...repRange] };
}

/** Existing normalized goal blend, shared by prescription and independent validation. */
export function getRepRange(priority: ExercisePriority, goals: GoalWeights): [number, number] {
  const entries = (Object.entries(goals) as Array<[TrainingGoal, number]>).filter(([goal, weight]) => weight > 0 && !!rules.goals[goal]);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!(total > 0)) return [8, 12];
  const lower = Math.max(1, Math.round(entries.reduce((sum, [goal, weight]) => sum + weight / total * rules.goals[goal].repRanges[priority][0], 0)));
  const upper = Math.max(lower, Math.round(entries.reduce((sum, [goal, weight]) => sum + weight / total * rules.goals[goal].repRanges[priority][1], 0)));
  return [lower, upper];
}

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
 * Working-weight ceiling for one exercise from its own estimated 1RM.
 * Same Epley inversion the cold-start 1RM path already uses:
 * weight = 1RM / (1 + reps/30), rounded to the exercise step.
 */
export function epleyWorkingWeightCeiling(oneRM: number, plannedReps: number, step: number): number {
  if (!(oneRM > 0) || !(plannedReps > 0) || !(step > 0)) return 0;
  const raw = oneRM / (1 + plannedReps / 30);
  return Math.round(raw / step) * step;
}

/**
 * New-build RPE 8 load: two repetitions in reserve, using the same Epley
 * relation at target reps + 2. ROUTINE_AUDIT.md RPE 8 / 9 October ceiling
 * rule. Floor to the unit's existing step; never round above capacity.
 * Keep the original ceiling helper unchanged for historical v1 replay.
 */
export function epleyRpe8WorkingWeight(oneRM: number, plannedReps: number, step: number): number {
  if (!Number.isFinite(oneRM) || !Number.isFinite(plannedReps) || !Number.isFinite(step) ||
      !(oneRM > 0) || !(plannedReps > 0) || !(step > 0)) return 0;
  return Math.floor(oneRM / (1 + (plannedReps + 2) / 30) / step) * step;
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
 * Weight step for UI and progression (equipment-aware, Phase 1 loading profile).
 */
export function getWeightStep(exercise: Exercise): number {
  return getExerciseIncrementKg(exercise);
}

/**
 * Get minimum weight for exercise (empty bar/dumbbell minimum)
 */
export function getMinimumWeight(exercise: Exercise): number {
  const mode = getExerciseLoadingProfile(exercise).loadDisplayMode;
  // Bodyweight exercises
  if (exercise.equipment.length === 0) return 0;

  // Barbell exercises
  if (mode === 'total_bar' && exercise.equipment.includes('barbell')) return 20; // empty bar

  // Dumbbell exercises
  if (mode === 'per_dumbbell' && exercise.equipment.includes('dumbbells')) return 2.5; // smallest plate

  // Machine exercises
  if (mode === 'cable_stack' && exercise.equipment.some((e) => e.includes('machine'))) return 5;

  // Default
  // No positive floor is defined in this unit; never reuse a generic kilogram.
  return 0;
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
    // A successful maximum advances load and starts the next rep cycle.
    if (currentReps >= maxReps) {
      return minReps;
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

// ============================================================================
// DOUBLE PROGRESSION + RPE POLICY (single source of truth for next-session load)
// ============================================================================

export type PerformedSetLike = { weight: number; reps: number; rpe?: number };

type ProgressionPerformance = {
  sets: PerformedSetLike[];
  sessionComplete?: boolean;
  plannedSetCount?: number;
  prescription?: ExercisePerformance['prescription'];
};

function assessPrescription(performance: ProgressionPerformance, range: [number, number], cap: number) {
  const { prescription, sets } = performance;
  const planned = prescription?.sets;
  const validPlan = !!planned?.length && planned.length === performance.plannedSetCount &&
    new Set(planned.map(set => set?.setIndex)).size === planned.length && planned.every((set, index) => !!set &&
      Number.isInteger(set.setIndex) && set.setIndex > 0 && (index === 0 || set.setIndex > planned[index - 1].setIndex) &&
      Number.isInteger(set.targetReps) && set.targetReps > 0 && Number.isFinite(set.suggestedWeight) && set.suggestedWeight >= 0 &&
      set.targetReps === planned[0].targetReps && set.suggestedWeight === planned[0].suggestedWeight);
  const comparable = validPlan && !prescription?.adjusted && performance.sessionComplete === true &&
    prescription?.context?.policyVersion === DOUBLE_PROGRESSION_POLICY_VERSION &&
    JSON.stringify(prescription.context.repRange) === JSON.stringify(range) && sets.length === planned.length &&
    sets.every((set, index) => Number.isInteger(set.reps) && set.reps > 0 && set.weight === planned[index].suggestedWeight &&
      (set.rpe == null || Number.isFinite(set.rpe) && set.rpe >= 1 && set.rpe <= 10));
  const hit = comparable && sets.every((set, index) => set.reps >= planned[index].targetReps);
  const easy = comparable && sets.every(set => set.rpe == null || set.rpe <= cap);
  return { validPlan, comparable, hit, easy, success: hit && easy };
}

/** New explicit baselines reset the comparison; undated legacy baselines yield to qualified work. */
export function baselineGoverns(exercise: Exercise, userState: UserState): boolean {
  if (!(userState.estimated1RM?.[exercise.id]! > 0)) return false;
  const last = userState.lastSessionPerformance?.[exercise.id];
  if (!last) return true;
  const qualified = (userState.recentSessionPerformance?.[exercise.id] ?? [last]).find(entry => isQualifiedPerformance(exercise, entry));
  if (!qualified && !last.prescription) return true;
  const date = userState.baselineUpdatedAt?.[exercise.id];
  return !!date && (!Number.isFinite(Date.parse(date)) || Date.parse(date) >= Date.parse(qualified?.date ?? last.date));
}

/** Shared pure decision consumed by every builder and by validation of its inputs/output. */
export function deriveProgressionDecision(exercise: Exercise, userState: UserState, repRange: [number, number], nextSetCount?: number): DoubleProgressionDecision | null {
  if (userState.performanceHistory && (userState.performanceHistory.status !== 'available' ||
      !userState.performanceHistory.requestedExerciseIds.includes(exercise.id))) return null;
  const last = userState.lastSessionPerformance?.[exercise.id];
  if (!last?.evidence || last.exerciseId !== exercise.id || last.evidence.source !== PERFORMANCE_HISTORY_SOURCE ||
      !last.evidence.itemId || !last.evidence.sessionId || !Number.isFinite(Date.parse(last.date)) ||
      !Array.isArray(last.evidence.reasons) || !Array.isArray(last.evidence.plannedSetIndices) ||
      !Array.isArray(last.sets) || last.sets.some(set => !set) ||
      last.prescription && (!Array.isArray(last.prescription.sets) || last.prescription.sets.some(set => !set))) return null;
  const recent = userState.recentSessionPerformance?.[exercise.id];
  if (recent && (!recent.length || JSON.stringify(performanceHistorySignature(recent[0])) !== JSON.stringify(performanceHistorySignature(last)))) return null;
  const historicalReplay = userState.prescriptionPolicy === 'v1';
  if (!historicalReplay && baselineGoverns(exercise, userState)) return null;
  const qualified: boolean = Boolean(isQualifiedPerformance(exercise, last));
  if (last.prescription && (last.prescription.sets.length !== last.evidence.plannedSetIndices.length ||
      last.prescription.sets.some(set => !last.evidence!.plannedSetIndices.includes(set.setIndex)))) return null;
  if (!qualified) {
    const profile = getExerciseLoadingProfile(exercise);
    const repeatableReasons = ['session_unfinished', 'exercise_skipped_or_unknown', 'incomplete_or_invalid_sets', 'mixed_loads', 'uncalibrated_external_zero'];
    if (historicalReplay || !last.evidence.reasons.length || last.evidence.reasons.some(reason => !repeatableReasons.includes(reason)) ||
        last.evidence.loadUnit !== 'kg' || last.evidence.loadDisplayMode !== profile.loadDisplayMode || last.evidence.prescriptionType !== profile.prescriptionType) return null;
  }
  const consecutive: ExercisePerformance[] = [];
  const seen = new Set<string>();
  let newer = Infinity;
  for (const entry of recent ?? [last]) {
    if (!isQualifiedPerformance(exercise, entry) || seen.has(entry.evidence!.sessionId) || Date.parse(entry.date) >= newer) break;
    const baselineAt = userState.estimated1RM?.[exercise.id]! > 0 ? userState.baselineUpdatedAt?.[exercise.id] : undefined;
    if (!historicalReplay && baselineAt && Date.parse(entry.date) <= Date.parse(baselineAt)) break;
    seen.add(entry.evidence!.sessionId);
    newer = Date.parse(entry.date);
    consecutive.push(entry);
  }
  return decideDoubleProgression({ exercise, lastSets: last.sets, repRange, qualified, prescription: last.prescription,
    plannedSetCount: last.plannedSetCount, sessionComplete: last.sessionComplete, nextSetCount, historicalReplay,
    holdStreak: countHoldStreak(consecutive, repRange, 8, historicalReplay) });
}

/** Estimate only for calibration/re-anchoring; never a cap on a qualified prescription decision. */
export function governingLoadEvidence(exercise: Exercise, userState: UserState, _plannedReps: number): { oneRM?: number; source: 'baseline' | 'history' | 'default' } {
  const baseline = userState.estimated1RM?.[exercise.id];
  const fallback = { oneRM: baseline, source: baseline ? 'baseline' as const : 'default' as const };
  const last = userState.lastSessionPerformance?.[exercise.id];
  if (userState.prescriptionPolicy === 'v1' || baselineGoverns(exercise, userState) || !isQualifiedPerformance(exercise, last) ||
      userState.performanceHistory && (userState.performanceHistory.status !== 'available' || !userState.performanceHistory.requestedExerciseIds.includes(exercise.id))) return fallback;
  const recent = userState.recentSessionPerformance?.[exercise.id];
  if (recent && (!recent.length || JSON.stringify(performanceHistorySignature(recent[0])) !== JSON.stringify(performanceHistorySignature(last)))) return fallback;
  const baselineAt = baseline && baseline > 0 ? userState.baselineUpdatedAt?.[exercise.id] : undefined;
  let oneRM = 0, newer = Infinity;
  const seen = new Set<string>();
  for (const entry of recent ?? [last]) {
    if (!isQualifiedPerformance(exercise, entry) || Date.parse(entry.date) >= newer || seen.has(entry.evidence!.sessionId)) break;
    newer = Date.parse(entry.date);
    seen.add(entry.evidence!.sessionId);
    if (baselineAt && newer <= Date.parse(baselineAt)) break;
    for (const set of entry.sets) oneRM = Math.max(oneRM, set.weight * (1 + set.reps / 30));
  }
  return oneRM > 0 ? { oneRM, source: 'history' } : fallback;
}

export type DoubleProgressionAction = 'increase' | 'hold' | 'deload' | 'progress_reps' | 'add_weight';

export type DoubleProgressionDecision = {
  action: DoubleProgressionAction;
  /** Next session working weight (kg). For bodyweight actions this stays 0. */
  nextWeight: number;
  /** Absent only for explicit historical replay. */
  nextReps?: number;
  /** Increment applied on increase (kg), for display. */
  incrementKg: number;
  /** User-facing reason, e.g. "+2.5kg — you hit 3×7 @ RPE 7 last time." */
  reason: string;
};

function fmtKgShort(n: number): string {
  return Math.abs(n - Math.round(n)) < 1e-6 ? `${Math.round(n)}` : `${Number(n.toFixed(6))}`;
}

/** "3×7" when uniform, "8/8/7 reps" when mixed; appends "@ RPE 8" for the hardest set. */
export function summarizeSetsForHumans(sets: PerformedSetLike[]): string {
  if (sets.length === 0) return 'no sets';
  const reps = sets.map((s) => s.reps);
  const uniform = reps.every((r) => r === reps[0]);
  const repsPart = uniform ? `${sets.length}×${reps[0]}` : `${reps.join('/')} reps`;
  const rpes = sets.map((s) => s.rpe).filter((r): r is number => r != null);
  const rpePart = rpes.length > 0 ? ` @ RPE ${Math.max(...rpes)}` : '';
  return `${repsPart}${rpePart}`;
}

function workingWeight(sets: PerformedSetLike[]): number {
  if (sets.length === 0) return 0;
  return Math.max(...sets.map((s) => s.weight));
}

/** All sets at the top of the rep range with RPE <= cap → ready to load. */
export function meetsIncreaseCriteria(
  sets: PerformedSetLike[],
  repRange: [number, number],
  rpeCap = 8,
): boolean {
  if (sets.length === 0) return false;
  const [, maxReps] = repRange;
  return sets.every((s) => s.reps >= maxReps && (s.rpe == null || s.rpe <= rpeCap));
}

/**
 * Consecutive most-recent sessions (newest first) that held: failed the
 * increase criteria without improvement in comparable work. More repetitions
 * at the same load is progress, even below the top of the prescribed range.
 * Used for the "two consecutive holds → deload 10%" rule.
 */
export function countHoldStreak(
  sessions: Array<ProgressionPerformance>,
  repRange: [number, number],
  rpeCap = 8,
  historicalReplay = false,
): number {
  if (!historicalReplay) {
    const [current, older] = sessions;
    const a = current && assessPrescription(current, repRange, rpeCap);
    if (!a?.comparable || a.success) return 0;
    const b = older && assessPrescription(older, repRange, rpeCap);
    if (!b?.comparable || b.success || JSON.stringify(current.prescription) !== JSON.stringify(older.prescription)) return 1;
    const achieved = (p: ProgressionPerformance) => p.sets.reduce((total, set, i) => total + Math.min(set.reps, p.prescription!.sets[i].targetReps), 0);
    const mask = (p: ProgressionPerformance) => p.sets.map(set => set.rpe != null).join(',');
    const hardest = (p: ProgressionPerformance) => Math.max(...p.sets.map(set => set.rpe ?? 0));
    const sameRpeCoverage = mask(current) === mask(older);
    if (achieved(current) > achieved(older) || sameRpeCoverage && hardest(current) < hardest(older)) return 1;
    // Missing effort readings cannot establish two equally difficult attempts.
    return !a.hit && !b.hit || a.hit && b.hit && !a.easy && !b.easy && sameRpeCoverage ? 2 : 1;
  }
  let streak = 0;
  for (let i = 0; i < sessions.length; i++) {
    const current = sessions[i];
    if (current.sets.length === 0 || current.sessionComplete === false ||
        (current.plannedSetCount !== undefined && current.plannedSetCount !== current.sets.length) ||
        current.sets.some(set => !Number.isFinite(set.weight) || set.weight < 0 || !Number.isInteger(set.reps) || set.reps <= 0 || set.weight !== current.sets[0].weight)) break;
    if (meetsIncreaseCriteria(current.sets, repRange, rpeCap)) break;
    const older = sessions[i + 1];
    const comparable = older && older.sessionComplete !== false &&
      (older.plannedSetCount === undefined || older.plannedSetCount === older.sets.length) && current.sets.length === older.sets.length &&
      current.sets.every((set, index) => set.weight === older.sets[index].weight);
    if (comparable && current.sets.reduce((sum, set) => sum + set.reps, 0) >
      older.sets.reduce((sum, set) => sum + set.reps, 0)) break;
    streak += 1;
    // A weight change between sessions restarts the count: earlier sessions
    // were holds at a DIFFERENT load, so they don't stack toward a deload.
    if (older && !comparable) break;
  }
  return streak;
}

/**
 * Double progression + RPE decision for the next session of one exercise.
 *
 * - All sets at top of rep range with RPE <= 8 → +incrementKg
 *   (equipment-aware: ~2.5kg upper body / ~5kg lower body).
 * - Reps below range or RPE 9–10 → hold.
 * - Two consecutive holds → deload 10% and rebuild.
 * - Bodyweight: progress by reps; at 3×12 suggest adding weight.
 */
export function decideDoubleProgression(args: {
  exercise: Exercise;
  lastSets: PerformedSetLike[];
  repRange: [number, number];
  rpeCap?: number;
  /** Hold streak INCLUDING the last session (from countHoldStreak). */
  holdStreak?: number;
  /** When known, partial work cannot qualify for progression or stagnation. */
  plannedSetCount?: number;
  sessionComplete?: boolean;
  prescription?: ExercisePerformance['prescription'];
  /** Qualification is established by the canonical history projection. */
  qualified?: boolean;
  nextSetCount?: number;
  /** Frozen replay only; all new builders use the prescription-aware policy. */
  historicalReplay?: boolean;
}): DoubleProgressionDecision | null {
  const { exercise, lastSets, repRange } = args;
  const rpeCap = args.rpeCap ?? 8;
  if (!args.historicalReplay) {
    const profile = getExerciseLoadingProfile(exercise);
    if (profile.prescriptionType !== 'reps' || ['unspecified', 'assisted_bodyweight'].includes(profile.loadDisplayMode)) return null;
    const performance = { sets: lastSets, prescription: args.prescription, sessionComplete: args.sessionComplete, plannedSetCount: args.plannedSetCount };
    const assessment = assessPrescription(performance, repRange, rpeCap);
    const planned = args.prescription?.sets;
    if (!assessment.validPlan || !planned) return null;
    const { targetReps, suggestedWeight } = planned[0];
    const bodyweight = ['bodyweight', 'added_bodyweight'].includes(profile.loadDisplayMode) && suggestedWeight === 0;
    if (profile.loadDisplayMode === 'bodyweight' && suggestedWeight !== 0) return null;
    const step = getWeightStep(exercise);
    const repeat = (reason: string, weight = suggestedWeight): DoubleProgressionDecision => ({ action: 'hold', nextWeight: weight, nextReps: targetReps, incrementKg: 0, reason });
    if (suggestedWeight === 0 && !bodyweight) {
      if (args.qualified && !args.prescription?.adjusted && planned.every(set => set.loadRequiresConfirmation) &&
          lastSets.length === planned.length && lastSets.every(set => set.weight > 0 && set.weight === lastSets[0].weight)) {
        return repeat('Your first confirmed load establishes a repeat prescription; no increase has been earned yet.', lastSets[0].weight);
      }
      return null;
    }
    if (targetReps < repRange[0] || targetReps > repRange[1]) return null;
    // Never silently round a held load down, or turn an off-step observation into an increase.
    if (!bodyweight && Math.abs(suggestedWeight / step - Math.round(suggestedWeight / step)) > 1e-6) return repeat('Repeat the recorded prescription; confirm an equipment-compatible load before automatic progression.');
    if (!args.qualified || !assessment.comparable || args.nextSetCount !== undefined && args.nextSetCount !== planned.length) {
      return repeat('Repeat the frozen targets. Incomplete, adjusted, changed or incomparable work earns neither progression nor a stagnation penalty.');
    }
    if (assessment.success) {
      const nextReps = calculateNextReps(targetReps, repRange, 'increase');
      if (targetReps < repRange[1]) return { action: 'progress_reps', nextWeight: suggestedWeight, nextReps, incrementKg: 0,
        reason: `+1 rep per set — all ${planned.length}×${targetReps} prescribed reps were completed with no reported RPE above ${rpeCap}.` };
      if (bodyweight) return { action: 'add_weight', nextWeight: 0, nextReps: targetReps, incrementKg: step,
        reason: 'The prescribed range maximum was completed. Confirm any added load explicitly; keep the current bodyweight target until then.' };
      const nextWeight = Number((suggestedWeight + step).toFixed(6));
      return { action: 'increase', nextWeight, nextReps, incrementKg: step,
        reason: `+${fmtKgShort(step)}kg — all ${planned.length}×${targetReps} maximum targets were completed with no reported RPE above ${rpeCap}. Restart at ${nextReps} reps per set.` };
    }
    if ((args.holdStreak ?? 0) >= 2 && !bodyweight) {
      const floor = Math.ceil(getMinimumWeight(exercise) / step) * step;
      const nextWeight = Math.min(suggestedWeight, Math.max(floor, Math.round(suggestedWeight * .9 / step) * step));
      if (nextWeight >= suggestedWeight) return repeat('Two comparable unsuccessful attempts; the equipment minimum prevents a lower load. Repeat and review the load.');
      return { action: 'deload', nextWeight, nextReps: calculateNextReps(targetReps, repRange, 'decrease'), incrementKg: 0,
        reason: `Deload to ${fmtKgShort(nextWeight)}kg (−10% target, rounded to equipment) and ${repRange[0]} reps: two comparable unsuccessful attempts without improvement.` };
    }
    return repeat(`Repeat ${planned.length}×${targetReps} at ${fmtKgShort(suggestedWeight)}kg: ${assessment.hit ? 'reported effort exceeded the RPE cap' : 'not every prescribed rep target was met'}.`);
  }
  if (lastSets.length === 0) return null;
  if (args.sessionComplete === false ||
    (args.plannedSetCount !== undefined && lastSets.length !== args.plannedSetCount)) return null;
  if (lastSets.some((set) => !Number.isFinite(set.weight) || set.weight < 0 ||
    !Number.isInteger(set.reps) || set.reps <= 0 ||
    (set.rpe != null && (!Number.isFinite(set.rpe) || set.rpe < 1 || set.rpe > 10)))) return null;
  // A highest-weight set is not evidence that every set achieved that load.
  // Mixed-load work needs a separate reviewed progression policy.
  if (!lastSets.every((set) => set.weight === lastSets[0].weight)) return null;

  const step = getExerciseIncrementKg(exercise);
  const weight = workingWeight(lastSets);
  const summary = summarizeSetsForHumans(lastSets);
  const [, maxReps] = repRange;
  const loadMode = getExerciseLoadingProfile(exercise).loadDisplayMode;
  if (getExerciseLoadingProfile(exercise).prescriptionType !== 'reps' || loadMode === 'unspecified' ||
      (loadMode === 'bodyweight' && weight > 0)) return null;
  const isBodyweight = weight === 0 &&
    (loadMode === 'bodyweight' || loadMode === 'added_bodyweight');
  // Zero on an external implement means uncalibrated, not bodyweight work.
  if (weight === 0 && !isBodyweight) return null;
  // Assistance decreases as performance improves; ordinary kg increases have
  // the opposite meaning. Keep this out of the external-load rule.
  if (loadMode === 'assisted_bodyweight') return null;

  if (isBodyweight) {
    const minRepsHit = Math.min(...lastSets.map((s) => s.reps));
    if (lastSets.length >= 3 && minRepsHit >= 12) {
      return {
        action: 'add_weight',
        nextWeight: 0,
        incrementKg: step,
        reason: `You hit ${summary} — time to add weight (+${fmtKgShort(step)}kg).`,
      };
    }
    if (meetsIncreaseCriteria(lastSets, repRange, rpeCap)) {
      return {
        action: 'progress_reps',
        nextWeight: 0,
        incrementKg: 0,
        reason: `+1 rep per set — you hit ${summary} last time.`,
      };
    }
    return {
      action: 'progress_reps',
      nextWeight: 0,
      incrementKg: 0,
      reason: `Bodyweight — you got ${summary} last time. Work toward ${lastSets.length}×${maxReps}.`,
    };
  }

  if (meetsIncreaseCriteria(lastSets, repRange, rpeCap)) {
    const nextWeight = Math.round((weight + step) / step) * step;
    return {
      action: 'increase',
      nextWeight,
      incrementKg: nextWeight - weight,
      reason: `+${fmtKgShort(nextWeight - weight)}kg — you hit ${summary} last time.`,
    };
  }

  const holdStreak = args.holdStreak ?? 1;
  if (holdStreak >= 2) {
    const deloaded = Math.max(
      getMinimumWeight(exercise),
      Math.round((weight * 0.9) / step) * step,
    );
    return {
      action: 'deload',
      nextWeight: deloaded,
      incrementKg: 0,
      reason: `Deload to ${fmtKgShort(deloaded)}kg (−10% target, rounded to implement step/minimum) — two sessions stuck at ${fmtKgShort(weight)}kg. Build back up.`,
    };
  }

  const maxRpe = Math.max(...lastSets.map((s) => s.rpe ?? 0));
  const holdWhy =
    maxRpe >= 9
      ? `RPE ${maxRpe} last time — make ${fmtKgShort(weight)}kg feel smoother first`
      : `you got ${summary} last time; reach ${lastSets.length}×${maxReps} to move up`;
  return {
    action: 'hold',
    nextWeight: weight,
    incrementKg: 0,
    reason: `Holding ${fmtKgShort(weight)}kg — ${holdWhy}.`,
  };
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
