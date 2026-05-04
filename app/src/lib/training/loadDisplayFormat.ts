/**
 * Training load / prescription display helpers (Phase 1).
 * Keeps presentation rules out of UI components and avoids ambiguous raw "kg" strings.
 */
import type { Exercise, PlannedExercise } from './types';
import { getExerciseLoadingProfile } from './exerciseLoadingProfile';

function fmtKg(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-6) return `${Math.round(n)}`;
  return `${n.toFixed(1)}`;
}

/** Short clarification for what the logged kg value represents (empty when generic). */
export function formatLoadSemanticsSuffix(exercise: Exercise, weightKg: number): string {
  const p = getExerciseLoadingProfile(exercise);
  if (p.prescriptionType === 'carry_distance' || p.loadDisplayMode === 'per_hand') {
    return 'Per-hand load.';
  }
  if (p.loadDisplayMode === 'per_dumbbell') {
    return 'Per dumbbell.';
  }
  if (p.loadDisplayMode === 'total_bar') {
    return 'Total bar weight.';
  }
  if (p.loadDisplayMode === 'cable_stack' || p.loadDisplayMode === 'machine_total') {
    return 'Cable / stack weight.';
  }
  if (p.loadDisplayMode === 'added_bodyweight' && weightKg > 0) {
    return 'Added load on top of bodyweight.';
  }
  if (p.loadDisplayMode === 'assisted_bodyweight') {
    return 'Assistance weight (lower number = more help).';
  }
  if (p.loadDisplayMode === 'per_leg') {
    return 'Load for the working leg.';
  }
  return '';
}

/**
 * One-line summary for a planned set (session preview, exercise rows).
 */
export function formatPlannedSetSummary(
  exercise: Exercise,
  set: { targetReps: number; suggestedWeight: number },
): string {
  const p = getExerciseLoadingProfile(exercise);
  const w = set.suggestedWeight;
  const r = set.targetReps;
  const note = formatLoadSemanticsSuffix(exercise, w);

  if (p.prescriptionType === 'carry_distance') {
    return `~${r} m / set · ${fmtKg(w)} kg/hand`;
  }
  if (p.prescriptionType === 'time_hold') {
    if (w > 0) return `~${r}s hold · +${fmtKg(w)}kg`;
    return `~${r}s hold (bodyweight)`;
  }
  if (p.loadDisplayMode === 'bodyweight' && w === 0) {
    return `Bodyweight · ${r} reps`;
  }
  if (p.loadDisplayMode === 'assisted_bodyweight') {
    return `${fmtKg(w)}kg assist · ${r} reps`;
  }
  if (note) {
    return `${fmtKg(w)}kg · ${r} reps · ${note}`;
  }
  return `${fmtKg(w)}kg · ${r} reps`;
}

/** Session list / modal: first working set + set count. */
export function formatExercisePreviewLine(ex: PlannedExercise, exercise: Exercise): string {
  const first = ex.plannedSets[0];
  if (!first) return `${ex.plannedSets.length} sets`;
  const inner = formatPlannedSetSummary(exercise, first);
  return `${ex.plannedSets.length} sets · ${inner}`;
}
