/**
 * Program-quality selection ranking — prefers progression-friendly defaults per intent slot.
 * Data-driven; extend BY_INTENT / CORE_SUBTYPE rather than scattering magic numbers in the engine.
 */
import { getExerciseLoadingProfile } from './exerciseLoadingProfile';
import type { Exercise, MovementIntent, CoreSubtype, SessionSelectionHints } from './types';

export type { CoreSubtype, SessionSelectionHints };

/** Higher = better fit as first compound for this intent (required slot). */
const PRIMARY_FIT: Partial<Record<string, Partial<Record<MovementIntent, number>>>> = {
  squat: { knee_dominant: 95 },
  front_squat: { knee_dominant: 88 },
  leg_press: { knee_dominant: 85 },
  hack_squat: { knee_dominant: 85 },
  goblet_squat: { knee_dominant: 72 },
  bulgarian_split_squat: { knee_dominant: 42 },
  lunges: { knee_dominant: 40 },
  step_ups: { knee_dominant: 45 },
  leg_extensions: { knee_dominant: 35 },
  deadlift: { hip_hinge: 95 },
  romanian_deadlift: { hip_hinge: 88 },
  sumo_deadlift: { hip_hinge: 88 },
  hip_thrust: { hip_hinge: 82 },
  good_mornings: { hip_hinge: 62 },
  barbell_bench_press: { horizontal_press: 95 },
  dumbbell_bench_press: { horizontal_press: 88 },
  incline_bench_press: { horizontal_press: 82 },
  dumbbell_flyes: { horizontal_press: 48 },
  overhead_press: { vertical_press: 92 },
  dumbbell_shoulder_press: { vertical_press: 88 },
  landmine_press: { vertical_press: 78 },
  arnold_press: { vertical_press: 80 },
  lat_pulldown: { vertical_pull: 90 },
  pull_ups: { vertical_pull: 92 },
  chin_ups: { vertical_pull: 90 },
  assisted_pull_ups: { vertical_pull: 72 },
  cable_row: { horizontal_pull: 88 },
  barbell_row: { horizontal_pull: 92 },
  t_bar_row: { horizontal_pull: 86 },
  farmer_walk: { carry: 92 },
  suitcase_carry: { carry: 85 },
  waiters_walk: { carry: 78 },
  pallof_press: { trunk_stability: 78 },
  plank: { trunk_stability: 72 },
  dead_bug: { trunk_stability: 78 },
  hanging_leg_raise: { trunk_stability: 72 },
  cable_crunch: { trunk_stability: 70 },
  ab_wheel_rollout: { trunk_stability: 68 },
  planche: { vertical_press: 15 },
  handstand: { vertical_press: 18 },
  pike_push_ups: { vertical_press: 55 },
};

/** Core pattern for trunk/carry-adjacent exercises (diversity + swap grouping). */
export const CORE_SUBTYPE_BY_ID: Partial<Record<string, CoreSubtype>> = {
  pallof_press: 'anti_rotation',
  plank: 'anti_extension',
  dead_bug: 'anti_extension',
  ab_wheel_rollout: 'anti_extension',
  bird_dog: 'anti_extension',
  cable_crunch: 'flexion',
  knee_raises: 'flexion',
  hanging_leg_raise: 'flexion',
  russian_twist: 'flexion',
  farmer_walk: 'loaded_carry_bracing',
  suitcase_carry: 'loaded_carry_bracing',
  waiters_walk: 'loaded_carry_bracing',
};

export function getCoreSubtype(exercise: Exercise): CoreSubtype {
  return CORE_SUBTYPE_BY_ID[exercise.id] ?? 'general_stability';
}

export function primaryFitScore(exercise: Exercise, intent: MovementIntent): number {
  return PRIMARY_FIT[exercise.id]?.[intent] ?? 55;
}

/**
 * Score delta from tiering + slot semantics. Added on top of legacy scoreExercise.
 */
export function selectionQualityDelta(
  exercise: Exercise,
  intent: MovementIntent,
  hints: SessionSelectionHints | undefined,
): { delta: number; tags: string[] } {
  const tags: string[] = [];
  if (!hints) {
    return { delta: 0, tags };
  }

  const fit = primaryFitScore(exercise, intent);
  const fitDelta = (fit - 55) * 0.45;
  tags.push(`Primary-fit ${Math.round(fit)}/100 for ${intent}`);

  let delta = fitDelta;

  const compoundMainIntents: MovementIntent[] = [
    'horizontal_press',
    'vertical_press',
    'horizontal_pull',
    'vertical_pull',
    'knee_dominant',
    'hip_hinge',
  ];

  if (hints.phase === 'required' && compoundMainIntents.includes(intent)) {
    if (exercise.unilateral && (intent === 'knee_dominant' || intent === 'hip_hinge')) {
      delta -= 38;
      tags.push('Unilateral leg pattern deprioritized for main leg slot (prefer bilateral when feasible)');
    }
    if (intent === 'knee_dominant' && exercise.unilateral === false && fit >= 80) {
      delta += 12;
      tags.push('Bilateral / machine squat pattern preferred for main knee slot');
    }
  }

  if (hints.phase === 'optional' && exercise.unilateral && (intent === 'knee_dominant' || intent === 'hip_hinge')) {
    delta += 18;
    tags.push('Unilateral variant favored in accessory context');
  }

  if (intent === 'trunk_stability') {
    const st = getCoreSubtype(exercise);
    if (hints.usedCoreSubtypes.includes(st)) {
      delta -= 22;
      tags.push(`Core subtype ${st} already used — variety penalty`);
    } else {
      delta += 8;
      tags.push(`Core subtype: ${st}`);
    }
  }

  if (intent === 'carry') {
    const carryFirst = exercise.intents[0] === 'carry';
    if (!carryFirst) {
      delta -= 25;
      tags.push('Prefer dedicated carry movement for carry intent');
    }
  }

  if (hints.phase === 'required' && intent === 'vertical_press') {
    const profile = getExerciseLoadingProfile(exercise);
    if (profile.compoundClassification === 'isolation') {
      delta -= 48;
      tags.push('Isolation pattern deprioritized for vertical press primary slot');
    }
    const vi = exercise.intents.indexOf('vertical_press');
    const ti = exercise.intents.indexOf('trunk_stability');
    if (vi >= 0 && ti >= 0 && ti < vi) {
      delta -= 36;
      tags.push('Trunk-dominant vertical skill deprioritized vs standard overhead pressing');
    }
  }

  return { delta, tags };
}
