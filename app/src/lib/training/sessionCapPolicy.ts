import { getExerciseLoadingProfile } from './exerciseLoadingProfile';
import type { PlannedExercise } from './types';
import type { ProgrammeIssue } from './weeklyProgrammeTypes';
import type { VolumeCaps } from './weeklyVolumeModel';
import { majorMuscleForIntent, majorMuscleOfExercise, smallMuscleOf } from './smallMuscleVolume';

/** D-P2 v2, ROUTINE_AUDIT.md: direct owner work only, never fractional credit. */
export function prescriptionOwner(item: PlannedExercise): string {
  const classification = getExerciseLoadingProfile(item.exercise).compoundClassification;
  const compound = classification === 'compound' || classification === 'infer' && item.exercise.intents.some(intent => majorMuscleForIntent(intent) !== null);
  return (compound ? majorMuscleOfExercise(item.exercise) ?? majorMuscleForIntent(item.intents[0]) : smallMuscleOf(item.exercise)) ?? majorMuscleOfExercise(item.exercise) ??
    majorMuscleForIntent(item.intents[0]) ?? item.exercise.musclesPrimary[0] ?? item.exerciseId;
}

/**
 * Weekly policy v5 (D-P2-01 amendment 2026-11-05): only the per-exercise and
 * per-owner session caps bind; there is no minute, total-set or per-priority cap.
 * Values come from V5_SESSION_CAPS in weeklyProgrammePolicy.ts.
 */
export type ExerciseOwnerCaps = { perExerciseSets: number; perOwnerSessionSets: number };

/**
 * New builds only. Every withheld set is exposed through programme diagnostics.
 * Without `ownerCaps` (v2/v3/v4 and the generic engine path) the accepted
 * exercise, owner, session-total, per-priority and minute limits all apply.
 * With `ownerCaps` (v5) only the per-exercise and per-owner limits apply.
 */
export function capNewSession(items: PlannedExercise[], caps?: VolumeCaps, minuteBudget = 60, owners?: string[], costs?: number[], ownerCaps?: ExerciseOwnerCaps) {
  const issues: ProgrammeIssue[] = [];
  const exercises: PlannedExercise[] = [];
  const muscle = new Map<string, number>();
  const counts = { primary: 0, accessory: 0, isolation: 0, total: 0 };
  const sessionLimits = !ownerCaps;
  let minutes = 10;
  const limit = Math.min(60, minuteBudget);
  for (const [index, item] of items.entries()) {
    const owner = owners?.[index] ?? prescriptionOwner(item);
    const cost = costs?.[index] ?? (item.priority === 'primary' ? 8 : item.priority === 'accessory' ? 5 : 3);
    const allowed = ownerCaps
      ? Math.max(0, Math.min(item.plannedSets.length, ownerCaps.perExerciseSets, ownerCaps.perOwnerSessionSets - (muscle.get(owner) ?? 0)))
      : Math.max(0, Math.min(item.plannedSets.length, 5,
        10 - (muscle.get(owner) ?? 0), 24 - counts.total,
        (caps?.perSessionTotal ?? 24) - counts.total,
        (caps?.perPriority[item.priority] ?? 24) - counts[item.priority],
        minutes + cost <= limit ? Infinity : 0));
    const n = Math.floor(allowed);
    if (n < item.plannedSets.length) issues.push({ code: 'volume_cap_shortfall', severity: 'warning',
      message: sessionLimits
        ? `${item.exerciseId}: ${item.plannedSets.length - n} ${owner} working sets unallocated under the exercise, owner-muscle, session or user cap.`
        : `${item.exerciseId}: ${item.plannedSets.length - n} ${owner} working sets unallocated under the exercise or owner-muscle cap.` });
    if (!n) continue;
    exercises.push({ ...item, plannedSets: item.plannedSets.slice(0, n) });
    muscle.set(owner, (muscle.get(owner) ?? 0) + n);
    counts.total += n;
    counts[item.priority] += n;
    minutes += cost;
  }
  if (sessionLimits && minutes > limit) issues.push({ code: 'session_minute_budget', severity: 'error', message: 'Warm-up and cooldown alone exceed the supplied time budget.' });
  return { exercises, issues, estimatedDurationMinutes: minutes };
}
