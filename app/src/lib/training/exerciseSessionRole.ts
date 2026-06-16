/**
 * Session role / primary-slot tiering — keeps compound “main lift” slots from being won by
 * accessory, skill, or mis-tagged patterns when intent match + raw score would allow it.
 */
import { getExerciseLoadingProfile } from './exerciseLoadingProfile';
import { primaryFitScore } from './exerciseSelectionRank';
import type {
  Exercise,
  MovementIntent,
  SessionTemplate,
  PlannedExercise,
  TrainingConstraints,
} from './types';

/** Higher numeric tier = weaker fit as default primary for a compound slot */
export enum PrimarySlotRoleTier {
  PrimaryDefault = 0,
  SecondaryCompound = 1,
  FallbackCompound = 2,
  AccessoryStyle = 3,
  Skill = 4,
  FinisherTechnique = 5,
  Mobility = 6,
}

const COMPOUND_GATE_INTENTS: MovementIntent[] = [
  'horizontal_press',
  'vertical_press',
  'horizontal_pull',
  'vertical_pull',
  'knee_dominant',
  'hip_hinge',
];

/**
 * Explicit per-intent primary-slot tiers (catalog-wide). Prefer extending here over engine one-offs.
 */
const PRIMARY_SLOT_TIER_OVERRIDES: Partial<
  Record<string, Partial<Record<MovementIntent, PrimarySlotRoleTier>>>
> = {
  shrugs: { vertical_pull: PrimarySlotRoleTier.AccessoryStyle },
  upright_row: {
    vertical_press: PrimarySlotRoleTier.AccessoryStyle,
    horizontal_pull: PrimarySlotRoleTier.AccessoryStyle,
  },
  cable_chest_flyes: { horizontal_press: PrimarySlotRoleTier.AccessoryStyle },
  dumbbell_flyes: { horizontal_press: PrimarySlotRoleTier.AccessoryStyle },
  nordic_curls: { hip_hinge: PrimarySlotRoleTier.AccessoryStyle },
  cossack_squat: { knee_dominant: PrimarySlotRoleTier.Mobility },
  handstand: { vertical_press: PrimarySlotRoleTier.Skill },
  handstand_push_ups: { vertical_press: PrimarySlotRoleTier.Skill },
  planche: { vertical_press: PrimarySlotRoleTier.Skill },
  pike_push_ups: { vertical_press: PrimarySlotRoleTier.FallbackCompound },
};

export function shouldApplyPrimarySlotGate(intent: MovementIntent): boolean {
  return COMPOUND_GATE_INTENTS.includes(intent);
}

/** Progressive relaxation of max inclusive tier for required compound slots */
export function primarySlotTierRelaxationSequence(): readonly PrimarySlotRoleTier[] {
  return [
    PrimarySlotRoleTier.SecondaryCompound,
    PrimarySlotRoleTier.FallbackCompound,
    PrimarySlotRoleTier.AccessoryStyle,
    PrimarySlotRoleTier.Mobility,
  ];
}

export function getPrimarySlotRoleTier(exercise: Exercise, intent: MovementIntent): PrimarySlotRoleTier {
  const o = PRIMARY_SLOT_TIER_OVERRIDES[exercise.id]?.[intent];
  if (o !== undefined) return o;

  const profile = getExerciseLoadingProfile(exercise);
  if (profile.defaultSelectionTier === 'avoid_default_progression') {
    return PrimarySlotRoleTier.FinisherTechnique;
  }

  const fit = primaryFitScore(exercise, intent);
  if (fit >= 80) return PrimarySlotRoleTier.PrimaryDefault;
  if (fit >= 68) return PrimarySlotRoleTier.SecondaryCompound;
  if (fit >= 55) return PrimarySlotRoleTier.FallbackCompound;
  if (fit >= 40) return PrimarySlotRoleTier.AccessoryStyle;
  if (fit < 30 && (intent === 'vertical_press' || intent === 'horizontal_pull')) {
    return PrimarySlotRoleTier.Skill;
  }
  return PrimarySlotRoleTier.AccessoryStyle;
}

/** Movement-family rank — lower = earlier in a coach-ordered session */
const MOVEMENT_FAMILY_ORDER: Record<MovementIntent, number> = {
  knee_dominant: 5,
  hip_hinge: 10,
  horizontal_press: 20,
  vertical_press: 22,
  vertical_pull: 28,
  horizontal_pull: 32,
  elbow_extension: 50,
  shoulder_isolation: 52,
  elbow_flexion: 55,
  trunk_stability: 75,
  carry: 82,
  conditioning: 90,
};

function coachOrderTuple(pe: PlannedExercise, constraints?: TrainingConstraints): [number, number, number, number] {
  const intent = pe.intents[0] ?? 'horizontal_press';
  const isOptional = pe.decisionTrace.selectionPhase === 'optional';
  const phaseBase = isOptional ? 1_000_000 : 0;

  let familyKey: number;
  const pi = constraints?.priorityIntents;
  if (!isOptional && pi && pi.length > 0) {
    const ix = pi.indexOf(intent);
    if (ix >= 0) familyKey = ix;
    else familyKey = 200 + (MOVEMENT_FAMILY_ORDER[intent] ?? 45);
  } else {
    familyKey = MOVEMENT_FAMILY_ORDER[intent] ?? 45;
  }

  const first = phaseBase + familyKey;
  const tier = getPrimarySlotRoleTier(pe.exercise, intent);
  const priRank = pe.priority === 'primary' ? 0 : pe.priority === 'accessory' ? 1 : 2;
  return [first, tier, priRank, pe.orderIndex];
}

export function buildCompareCoachOrder(constraints?: TrainingConstraints) {
  return (a: PlannedExercise, b: PlannedExercise): number => {
    const ca = coachOrderTuple(a, constraints);
    const cb = coachOrderTuple(b, constraints);
    for (let i = 0; i < 4; i++) {
      if (ca[i] !== cb[i]) return ca[i] - cb[i];
    }
    return 0;
  };
}

export function compareCoachOrder(a: PlannedExercise, b: PlannedExercise): number {
  return buildCompareCoachOrder()(a, b);
}

/**
 * Deterministic coach ordering: main movement families before arms/core/carry; better primary tiers earlier.
 */
export function sortPlannedExercisesCoachOrder(
  exercises: PlannedExercise[],
  _template: SessionTemplate,
  constraints?: TrainingConstraints,
): PlannedExercise[] {
  if (exercises.length <= 1) return exercises.map((e, i) => ({ ...e, orderIndex: i }));

  const cmp = buildCompareCoachOrder(constraints);
  const origIds = exercises.map((e) => e.exerciseId);
  const sorted = [...exercises].sort(cmp);
  const newIds = sorted.map((e) => e.exerciseId);
  const reordered = origIds.some((id, idx) => id !== newIds[idx]);

  return sorted.map((e, i) => ({
    ...e,
    orderIndex: i,
    decisionTrace: {
      ...e.decisionTrace,
      ...(reordered
        ? {
            coachOrderingNote:
              'Session sequence normalized for coach ordering (main patterns and progression lifts before accessories).',
          }
        : {}),
    },
  }));
}
