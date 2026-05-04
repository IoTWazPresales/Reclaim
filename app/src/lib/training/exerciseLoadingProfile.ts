/**
 * Exercise loading & prescription metadata (Phase 1 quality hotfix).
 *
 * Centralizes semantics that the legacy catalog could not express cleanly:
 * which intent row drives default kg, prescription type (reps vs carry distance),
 * load display meaning, and sensible weight increments.
 *
 * Prefer extending BY_ID for exceptional exercises; infer defaults from equipment + intents.
 */
import type { Exercise, MovementIntent } from './types';

/** Which movement-intent default row in suggestLoading() applies to this exercise */
export type LoadingIntentKey = MovementIntent | 'thruster_blend';

export type PrescriptionType =
  | 'reps'
  | 'carry_distance'
  | 'time_hold'
  | 'complex_reps';

export type LoadDisplayMode =
  | 'total_bar'
  | 'per_dumbbell'
  | 'per_hand'
  | 'per_leg'
  | 'cable_stack'
  | 'bodyweight'
  | 'added_bodyweight'
  | 'assisted_bodyweight'
  | 'machine_total'
  | 'unspecified';

export type CompoundClassification = 'infer' | 'isolation' | 'compound';

export type DefaultSelectionTier = 'normal' | 'avoid_default_progression';

export interface ExerciseLoadingProfile {
  loadingIntentKey: LoadingIntentKey;
  prescriptionType: PrescriptionType;
  loadDisplayMode: LoadDisplayMode;
  fixedIncrementKg?: number;
  defaultSelectionTier: DefaultSelectionTier;
  compoundClassification: CompoundClassification;
}

/** Mirrors engine getEquipmentClass — duplicated here to avoid import cycles with engine/index. */
function equipmentClass(eq: string): 'machine' | 'free_weight' | 'bodyweight' | 'other' {
  const e = eq.toLowerCase();
  if (e.includes('machine') || e.includes('cable')) return 'machine';
  const freeWeight = ['barbell', 'dumbbells', 'dumbbell', 'ez_bar', 'kettlebells', 'kettlebell', 'trap_bar', 'landmine'];
  if (freeWeight.some((x) => e.includes(x))) return 'free_weight';
  const bw = ['pull_up_bar', 'rings', 'floor', 'parallel_bars', 'dip_station'];
  if (bw.some((x) => e.includes(x))) return 'bodyweight';
  return 'other';
}

function isBodyweightExercise(exercise: Exercise): boolean {
  const allEquipment = [...(exercise.equipmentAll || []), ...(exercise.equipmentAny || []), ...exercise.equipment];
  if (allEquipment.length === 0) return true;
  return allEquipment.every((eq) => {
    const cls = equipmentClass(eq);
    return cls === 'bodyweight' || cls === 'other';
  });
}

function equipmentHas(exercise: Exercise, predicate: (s: string) => boolean): boolean {
  const all = [...(exercise.equipment ?? []), ...(exercise.equipmentAll ?? []), ...(exercise.equipmentAny ?? [])];
  return all.some((e) => predicate(e.toLowerCase()));
}

function isDumbbellLike(exercise: Exercise): boolean {
  return equipmentHas(exercise, (e) => e.includes('dumbbell'));
}

function isBarbellLike(exercise: Exercise): boolean {
  return equipmentHas(exercise, (e) => e === 'barbell' || e.includes('barbell'));
}

function isCableOrMachine(exercise: Exercise): boolean {
  return equipmentHas(exercise, (e) => e.includes('cable') || e.includes('machine'));
}

/**
 * Per-exercise overrides. Document any entry that is not obvious from the catalog alone.
 */
const BY_ID: Partial<Record<string, Partial<ExerciseLoadingProfile>>> = {
  /** Finisher / technique — scored down so it is not the default curl. */
  '21s': {
    loadingIntentKey: 'elbow_flexion',
    prescriptionType: 'complex_reps',
    loadDisplayMode: 'total_bar',
    defaultSelectionTier: 'avoid_default_progression',
    compoundClassification: 'isolation',
  },
  thruster: {
    loadingIntentKey: 'thruster_blend',
    prescriptionType: 'reps',
    loadDisplayMode: 'total_bar',
    defaultSelectionTier: 'normal',
    compoundClassification: 'compound',
  },
  farmer_walk: {
    loadingIntentKey: 'carry',
    prescriptionType: 'carry_distance',
    loadDisplayMode: 'per_hand',
    fixedIncrementKg: 1,
    defaultSelectionTier: 'normal',
    compoundClassification: 'isolation',
  },
  suitcase_carry: {
    loadingIntentKey: 'carry',
    prescriptionType: 'carry_distance',
    loadDisplayMode: 'per_hand',
    fixedIncrementKg: 1,
    defaultSelectionTier: 'normal',
    compoundClassification: 'isolation',
  },
  waiters_walk: {
    loadingIntentKey: 'carry',
    prescriptionType: 'carry_distance',
    loadDisplayMode: 'per_hand',
    fixedIncrementKg: 1,
    defaultSelectionTier: 'normal',
    compoundClassification: 'isolation',
  },
  pull_ups: {
    loadingIntentKey: 'vertical_pull',
    prescriptionType: 'reps',
    loadDisplayMode: 'bodyweight',
    fixedIncrementKg: 2.5,
    defaultSelectionTier: 'normal',
    compoundClassification: 'compound',
  },
  chin_ups: {
    loadingIntentKey: 'vertical_pull',
    prescriptionType: 'reps',
    loadDisplayMode: 'bodyweight',
    fixedIncrementKg: 2.5,
    defaultSelectionTier: 'normal',
    compoundClassification: 'compound',
  },
  push_ups: {
    loadingIntentKey: 'horizontal_press',
    prescriptionType: 'reps',
    loadDisplayMode: 'bodyweight',
    fixedIncrementKg: 2.5,
    defaultSelectionTier: 'normal',
    compoundClassification: 'compound',
  },
  diamond_push_ups: {
    loadingIntentKey: 'elbow_extension',
    prescriptionType: 'reps',
    loadDisplayMode: 'bodyweight',
    fixedIncrementKg: 2.5,
    defaultSelectionTier: 'normal',
    compoundClassification: 'isolation',
  },
  assisted_pull_ups: {
    loadingIntentKey: 'vertical_pull',
    prescriptionType: 'reps',
    loadDisplayMode: 'assisted_bodyweight',
    fixedIncrementKg: 2.5,
    defaultSelectionTier: 'normal',
    compoundClassification: 'compound',
  },
  dips_assisted: {
    loadingIntentKey: 'elbow_extension',
    prescriptionType: 'reps',
    loadDisplayMode: 'assisted_bodyweight',
    fixedIncrementKg: 2.5,
    defaultSelectionTier: 'normal',
    compoundClassification: 'compound',
  },
  plank: {
    loadingIntentKey: 'trunk_stability',
    prescriptionType: 'time_hold',
    loadDisplayMode: 'bodyweight',
    defaultSelectionTier: 'normal',
    compoundClassification: 'isolation',
  },
};

function inferLoadDisplay(exercise: Exercise): LoadDisplayMode {
  if (BY_ID[exercise.id]?.loadDisplayMode) {
    return BY_ID[exercise.id]!.loadDisplayMode!;
  }
  if (isBodyweightExercise(exercise)) {
    return 'bodyweight';
  }
  if (exercise.id.includes('assisted') || exercise.name.toLowerCase().includes('assisted')) {
    return 'assisted_bodyweight';
  }
  if (isDumbbellLike(exercise)) {
    return 'per_dumbbell';
  }
  if (isCableOrMachine(exercise)) {
    return 'cable_stack';
  }
  if (isBarbellLike(exercise)) {
    return 'total_bar';
  }
  if (
    exercise.unilateral &&
    (exercise.intents.includes('knee_dominant') || exercise.intents.includes('hip_hinge'))
  ) {
    return 'per_leg';
  }
  return 'unspecified';
}

function inferLoadingIntentKey(exercise: Exercise): LoadingIntentKey {
  const o = BY_ID[exercise.id]?.loadingIntentKey;
  if (o) return o;

  const rank = (i: MovementIntent): number => {
    const compound: MovementIntent[] = [
      'horizontal_press',
      'vertical_press',
      'horizontal_pull',
      'vertical_pull',
      'knee_dominant',
      'hip_hinge',
    ];
    if (compound.includes(i)) return 0;
    if (i === 'shoulder_isolation') return 1;
    return 2;
  };

  const sorted = [...exercise.intents].sort((a, b) => rank(a) - rank(b));
  const first = sorted[0];
  return (first ?? exercise.intents[0]) as LoadingIntentKey;
}

function inferPrescription(exercise: Exercise): PrescriptionType {
  if (BY_ID[exercise.id]?.prescriptionType) {
    return BY_ID[exercise.id]!.prescriptionType!;
  }
  if (exercise.intents.includes('carry')) {
    return 'carry_distance';
  }
  if (exercise.id === 'plank') {
    return 'time_hold';
  }
  return 'reps';
}

function inferCompoundClassification(exercise: Exercise): CompoundClassification {
  const o = BY_ID[exercise.id]?.compoundClassification;
  if (o && o !== 'infer') return o;
  return 'infer';
}

export function getExerciseLoadingProfile(exercise: Exercise): ExerciseLoadingProfile {
  const partial = BY_ID[exercise.id];
  return {
    loadingIntentKey: inferLoadingIntentKey(exercise),
    prescriptionType: inferPrescription(exercise),
    loadDisplayMode: inferLoadDisplay(exercise),
    fixedIncrementKg: partial?.fixedIncrementKg,
    defaultSelectionTier: partial?.defaultSelectionTier ?? 'normal',
    compoundClassification: inferCompoundClassification(exercise),
  };
}

/**
 * Rounding step for logged/planned weight edits (kg).
 */
export function getExerciseIncrementKg(exercise: Exercise): number {
  const profile = getExerciseLoadingProfile(exercise);
  if (profile.fixedIncrementKg !== undefined) {
    return profile.fixedIncrementKg;
  }
  if (profile.prescriptionType === 'carry_distance' || profile.loadDisplayMode === 'per_hand') {
    return isDumbbellLike(exercise) ? 1 : 2.5;
  }
  if (profile.loadDisplayMode === 'bodyweight' || profile.loadDisplayMode === 'assisted_bodyweight') {
    return 2.5;
  }
  if (isDumbbellLike(exercise)) {
    return 1;
  }
  if (isCableOrMachine(exercise)) {
    return 2.5;
  }
  if (isBarbellLike(exercise)) {
    return 2.5;
  }
  const lowerBodyIntents: MovementIntent[] = ['knee_dominant', 'hip_hinge'];
  const isLower = exercise.intents.some((i) => lowerBodyIntents.includes(i));
  return isLower ? 5 : 2.5;
}
