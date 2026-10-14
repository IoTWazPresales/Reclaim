import { getPrimarySlotRoleTier, PrimarySlotRoleTier } from './exerciseSessionRole';
import type { Exercise, TrainingProfileSnapshot } from './types';

/** Catalogue aliases refer to the same implement, not different availability. */
function equipmentToken(value: string): string {
  const token = value.trim().toLowerCase();
  return token === 'dumbbell' ? 'dumbbells' : token === 'kettlebell' ? 'kettlebells' : token;
}

export type EligibilityDiagnostic =
  | { code: 'equipment_all'; missing: string[] }
  | { code: 'equipment_any' | 'equipment_unavailable'; requiredAny: string[] }
  | { code: 'contraindication'; injuries: string[] }
  | { code: 'forbidden_movement'; intents: Exercise['intents'] }
  | { code: 'excluded_exercise'; exerciseId: string; source: 'hatesExercises' | 'excludedExerciseIds' }
  | { code: 'skill_not_enabled'; intents: Exercise['intents'] };

export type EligibilityPolicyException = {
  code: 'entered_rack_exception';
  waivedEquipment: ['rack'];
  exerciseId: string;
  baseline: number;
  pendingDecision: 'D-P2-06';
  provenance: 'docs/training/ROUTINE_AUDIT.md: balanced week 2026-10-09';
};

export type ExerciseEligibility = {
  eligible: boolean;
  /** Compatibility summaries; consumers should use diagnostics for decisions. */
  reasons: string[];
  warnings: string[];
  diagnostics: EligibilityDiagnostic[];
  policyExceptions: EligibilityPolicyException[];
};

export type ExerciseEligibilityOptions = {
  /** Existing balanced policy only; never implies the rack is actually available. */
  allowEnteredRackException?: boolean;
  /** Caller exclusions (e.g. the original exercise when evaluating replacements). */
  excludedExerciseIds?: readonly string[];
  /** Skill preference is slot-specific in the accepted selector. */
  selectionIntent?: Exercise['intents'][number];
};

/** Shared hard constraints for programme choices and user-proposed substitutions. */
export function evaluateExerciseEligibility(
  exercise: Exercise,
  profile: TrainingProfileSnapshot,
  options: ExerciseEligibilityOptions = {},
): ExerciseEligibility {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const diagnostics: EligibilityDiagnostic[] = [];
  const policyExceptions: EligibilityPolicyException[] = [];
  const available = new Set(profile.equipment_access.map(equipmentToken));
  const missing = (exercise.equipmentAll ?? []).filter((item) => !available.has(equipmentToken(item)));
  const baseline = profile.baselines?.[exercise.id] ?? 0;
  const entered = Number.isFinite(baseline) && baseline > 0;
  if (missing.length) {
    if (options.allowEnteredRackException && entered && missing.every((item) => equipmentToken(item) === 'rack')) {
      warnings.push('entered_rack_exception: ROUTINE_AUDIT.md balanced week 2026-10-09');
      policyExceptions.push({ code: 'entered_rack_exception', waivedEquipment: ['rack'],
        exerciseId: exercise.id, baseline, pendingDecision: 'D-P2-06',
        provenance: 'docs/training/ROUTINE_AUDIT.md: balanced week 2026-10-09' });
    } else {
      reasons.push(`equipment_all:${missing.join(',')}`);
      diagnostics.push({ code: 'equipment_all', missing: missing.map(equipmentToken) });
    }
  }
  if (exercise.equipmentAny?.length && !exercise.equipmentAny.some((item) => available.has(equipmentToken(item)))) {
    reasons.push(`equipment_any:${exercise.equipmentAny.join(',')}`);
    diagnostics.push({ code: 'equipment_any', requiredAny: exercise.equipmentAny.map(equipmentToken) });
  }
  if (!exercise.equipmentAll?.length && !exercise.equipmentAny?.length && exercise.equipment.length &&
      !exercise.equipment.some((item) => available.has(equipmentToken(item)))) {
    reasons.push('equipment_unavailable');
    diagnostics.push({ code: 'equipment_unavailable', requiredAny: exercise.equipment.map(equipmentToken) });
  }
  const injuries = exercise.contraindications.filter((item) => profile.constraints?.injuries?.includes(item));
  if (injuries.length) {
    reasons.push('contraindication');
    diagnostics.push({ code: 'contraindication', injuries });
  }
  const forbidden = exercise.intents.filter((item) => profile.constraints?.forbiddenMovements?.includes(item));
  if (forbidden.length) {
    reasons.push('forbidden_movement');
    diagnostics.push({ code: 'forbidden_movement', intents: forbidden });
  }
  // chooseExercise already treats hatesExercises as a hard exclusion. Never
  // relax it silently to fill an otherwise empty movement pool.
  const disliked = profile.constraints?.preferences?.hatesExercises?.includes(exercise.id);
  const excluded = options.excludedExerciseIds?.includes(exercise.id);
  if (disliked || excluded) {
    reasons.push('excluded_exercise');
    if (disliked) diagnostics.push({ code: 'excluded_exercise', exerciseId: exercise.id, source: 'hatesExercises' });
    if (excluded) diagnostics.push({ code: 'excluded_exercise', exerciseId: exercise.id, source: 'excludedExerciseIds' });
  }
  // A multi-intent exercise can be Skill for one slot and a fallback for another.
  // Without slot context, leave that gate to the caller rather than inventing a
  // catalogue-wide exclusion. Equipment/injury/dislike checks remain unconditional.
  const skillIntents = options.selectionIntent !== undefined &&
    getPrimarySlotRoleTier(exercise, options.selectionIntent) === PrimarySlotRoleTier.Skill
    ? [options.selectionIntent] : [];
  if (!profile.constraints?.preferences?.includeSkillWork && skillIntents.length) {
    reasons.push('skill_not_enabled');
    diagnostics.push({ code: 'skill_not_enabled', intents: skillIntents });
  }
  return { eligible: diagnostics.length === 0, reasons, warnings, diagnostics, policyExceptions };
}

/**
 * Shared candidate boundary for generation and substitution. Preserves input
 * order and every rejection; performs no ranking, slot matching or prescription.
 * The caller supplies actual catalogue records, not synthesized exercises.
 */
export function evaluateExerciseCandidates(
  candidates: readonly Exercise[],
  profile: TrainingProfileSnapshot,
  options: ExerciseEligibilityOptions = {},
): Array<{ exercise: Exercise; eligibility: ExerciseEligibility }> {
  return candidates.map((exercise) => ({ exercise, eligibility: evaluateExerciseEligibility(exercise, profile, options) }));
}
