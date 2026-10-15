import type { Exercise, PlannedSet } from './types';
import { formatPlannedSetSummary } from './loadDisplayFormat';
import { applyAutoregulation, type AutoregulationInput, type AutoregulationResult } from './runtime/autoregulation';
import { getExerciseIncrementKg, getExerciseLoadingProfile } from './exerciseLoadingProfile';

/** JSON overlay: deltas are relative to the frozen next planned set, never history. */
export type AutoregulationOverlay = { weightDelta: number; repsDelta: number; reason: string };
export type AppliedAdjustment = {
  status: 'applied';
  setIndex: number;
  weightKg: number;
  reps: number;
  loadConvention: ReturnType<typeof getExerciseLoadingProfile>['loadDisplayMode'];
  ruleId: string;
  message: string;
  overlay: AutoregulationOverlay;
};
export type AdjustmentOutcome = AppliedAdjustment | {
  status: 'unchanged';
  reason: 'invalid_input' | 'no_next_set' | 'unsupported_units' | 'skip_advisory' | 'no_recommendation' | 'no_effect';
  message: string;
};

const unchanged = (reason: Extract<AdjustmentOutcome, { status: 'unchanged' }>['reason'], message: string): AdjustmentOutcome =>
  ({ status: 'unchanged', reason, message });

/** Adapt existing rule output; thresholds, equipment rounding and rep floors stay unchanged. */
export function autoregulationOverlay(result: AutoregulationResult, next: PlannedSet, exercise: Exercise): AdjustmentOutcome {
  const profile = getExerciseLoadingProfile(exercise);
  if (profile.prescriptionType !== 'reps' || profile.loadDisplayMode === 'unspecified') {
    return unchanged('unsupported_units', 'No adjustment applied: this prescription has unsupported units.');
  }
  if (profile.loadDisplayMode === 'bodyweight' && (next.suggestedWeight !== 0 || (result.adjustedWeight !== undefined && result.adjustedWeight !== 0))) {
    return unchanged('unsupported_units', 'No adjustment applied: this bodyweight prescription has an inconsistent external load.');
  }
  if (!['bodyweight', 'added_bodyweight', 'assisted_bodyweight'].includes(profile.loadDisplayMode) && next.suggestedWeight === 0) {
    return unchanged('unsupported_units', 'No adjustment applied: the next external load is uncalibrated.');
  }
  if (!Number.isFinite(next.suggestedWeight) || next.suggestedWeight < 0 || !Number.isInteger(next.targetReps) || next.targetReps < 1) {
    return unchanged('invalid_input', 'No adjustment applied: the next target is invalid.');
  }
  const adjustment = result.adjustment;
  if (adjustment?.skipRemainingSets) {
    return unchanged('skip_advisory', 'No sets skipped automatically. Ending this exercise remains your choice.');
  }
  if (!adjustment) return unchanged('no_recommendation', result.message);
  // Multiplier-only fatigue output has no authorized applied kg target. Do not activate it here.
  if (result.adjustedWeight === undefined && result.adjustedReps === undefined) {
    return unchanged('no_recommendation', 'No adjustment applied: the recommendation has no effective weight or repetition target.');
  }
  if ((result.adjustedWeight !== undefined && (!Number.isFinite(result.adjustedWeight) || result.adjustedWeight < 0)) ||
      (result.adjustedReps !== undefined && (!Number.isFinite(result.adjustedReps) || result.adjustedReps < 1))) {
    return unchanged('invalid_input', 'No adjustment applied: the recommended target is invalid.');
  }
  if (profile.loadDisplayMode === 'assisted_bodyweight' && result.adjustedWeight !== undefined && result.adjustedWeight !== next.suggestedWeight) {
    return unchanged('unsupported_units', 'No adjustment applied: assistance needs a separate load policy.');
  }
  const step = getExerciseIncrementKg(exercise);
  const weightKg = result.adjustedWeight === undefined ? next.suggestedWeight : Math.max(0, Math.round(result.adjustedWeight / step) * step);
  const reps = result.adjustedReps === undefined ? next.targetReps : Math.max(1, Math.round(result.adjustedReps));
  if (weightKg === next.suggestedWeight && reps === next.targetReps) {
    return unchanged('no_effect', 'No adjustment applied: the effective next target is unchanged.');
  }
  const context = result.reason === 'high_rpe' ? 'High effort' : result.reason === 'reps_drop' ? 'Repetition drop' : 'Performance adjustment';
  const message = `${context}. Next set: ${formatPlannedSetSummary(exercise, { suggestedWeight: weightKg, targetReps: reps }).replace(/\.$/, '')}.`;
  return {
    status: 'applied', setIndex: next.setIndex, weightKg, reps, loadConvention: profile.loadDisplayMode,
    ruleId: adjustment.ruleId, message,
    overlay: { weightDelta: weightKg - next.suggestedWeight, repsDelta: reps - next.targetReps, reason: message },
  };
}

/** Validate production inputs before calling the unchanged numerical rules. */
export function recommendSessionAdjustment(input: AutoregulationInput, next: PlannedSet | undefined, exercise: Exercise | null | undefined): AdjustmentOutcome {
  if (!next) return unchanged('no_next_set', 'No adjustment applied: there is no next set.');
  if (!exercise || input.exerciseId !== exercise.id ||
      !Number.isInteger(input.currentSetIndex) || input.currentSetIndex < 1 ||
      !Number.isFinite(input.currentSetWeight) || input.currentSetWeight < 0 ||
      !Number.isFinite(input.suggestedWeight) || input.suggestedWeight < 0 ||
      !Number.isInteger(input.currentSetReps) || input.currentSetReps < 1 ||
      !Number.isInteger(input.targetReps) || input.targetReps < 1 ||
      (input.currentSetRpe !== undefined && (!Number.isFinite(input.currentSetRpe) || input.currentSetRpe < 1 || input.currentSetRpe > 10))) {
    return unchanged('invalid_input', 'No adjustment applied: performance input is unavailable or invalid.');
  }
  const profile = getExerciseLoadingProfile(exercise);
  if (profile.loadDisplayMode === 'bodyweight' && (input.currentSetWeight !== 0 || input.suggestedWeight !== 0)) {
    return unchanged('unsupported_units', 'No adjustment applied: bodyweight performance has an inconsistent external load.');
  }
  return autoregulationOverlay(applyAutoregulation(input), next, exercise);
}
