// Training engine - deterministic, explainable workout generation
import exercisesData from '../catalog/exercises.v1.json';
import exerciseCuesData from '../catalog/exerciseCues.v1.json';
import rulesData from '../rules/rules.v1.json';
import {
  getWeightStep,
  getMinimumWeight,
  detectFatigue,
  decideDoubleProgression,
  countHoldStreak,
  type DoubleProgressionDecision,
} from '../progression';
import { getExerciseLoadingProfile } from '../exerciseLoadingProfile';
import { applyOptionalAdaptiveLoadBias } from '../adaptiveLoadBias';
import type {
  Exercise,
  MovementIntent,
  TrainingGoal,
  SessionTemplate,
  ExperienceLevel,
  ExercisePriority,
  GoalWeights,
  TrainingConstraints,
  UserState,
  PlannedExercise,
  PlannedSet,
  DecisionTrace,
  SessionPlan,
  SessionState,
  BuildSessionInput,
  ChooseExerciseInput,
  SuggestLoadingInput,
  AdaptSessionInput,
  ExerciseScore,
  EquipmentClass,
  CoreSubtype,
  SessionSelectionHints,
  TrainingProfileSnapshot,
} from '../types';
import { getCoreSubtype, selectionQualityDelta } from '../exerciseSelectionRank';
import {
  getPrimarySlotRoleTier,
  PrimarySlotRoleTier,
  primarySlotTierRelaxationSequence,
  shouldApplyPrimarySlotGate,
  sortPlannedExercisesCoachOrder,
} from '../exerciseSessionRole';

const exerciseCuesMap = exerciseCuesData as Record<string, string[]>;
const exercises = (exercisesData as Exercise[]).map((ex) =>
  exerciseCuesMap[ex.id] ? { ...ex, cues: exerciseCuesMap[ex.id] } : ex,
);
const rules = rulesData as any;

// ============================================================================
// EQUIPMENT CLASSIFICATION & VALIDATION (Task 1 & 2)
// ============================================================================

/**
 * Classify equipment into categories for preference scoring
 * - machine: contains 'machine' OR 'cable'
 * - free_weight: barbell, dumbbells, ez_bar, kettlebells, trap_bar, landmine, kettlebell, dumbbell
 * - bodyweight: pull_up_bar, rings, floor, parallel_bars, dip_station
 * - other: bench, box, rack, anything else
 */
export function getEquipmentClass(equipment: string): EquipmentClass {
  const eq = equipment.toLowerCase();

  // Machine classification
  if (eq.includes('machine') || eq.includes('cable')) {
    return 'machine';
  }

  // Free weight classification
  const freeWeightEquipment = [
    'barbell',
    'dumbbells',
    'dumbbell',
    'ez_bar',
    'kettlebells',
    'kettlebell',
    'trap_bar',
    'landmine',
  ];
  if (freeWeightEquipment.includes(eq)) {
    return 'free_weight';
  }

  // Bodyweight classification
  const bodyweightEquipment = ['pull_up_bar', 'rings', 'floor', 'parallel_bars', 'dip_station'];
  if (bodyweightEquipment.includes(eq)) {
    return 'bodyweight';
  }

  // Everything else (bench, rack, box, etc.)
  return 'other';
}

/**
 * Check if exercise is machine-biased (primarily uses machine equipment)
 */
export function isMachineBiased(exercise: Exercise): boolean {
  const allEquipment = [...(exercise.equipmentAll || []), ...(exercise.equipmentAny || []), ...exercise.equipment];
  if (allEquipment.length === 0) return false;

  const machineCount = allEquipment.filter((eq) => getEquipmentClass(eq) === 'machine').length;
  return machineCount > 0;
}

/**
 * Check if exercise is free-weight-biased
 */
export function isFreeWeightBiased(exercise: Exercise): boolean {
  const allEquipment = [...(exercise.equipmentAll || []), ...(exercise.equipmentAny || []), ...exercise.equipment];
  if (allEquipment.length === 0) return false;

  const freeWeightCount = allEquipment.filter((eq) => getEquipmentClass(eq) === 'free_weight').length;
  // Must have free weights and no machines
  const hasMachine = allEquipment.some((eq) => getEquipmentClass(eq) === 'machine');
  return freeWeightCount > 0 && !hasMachine;
}

/**
 * Check if exercise is bodyweight-only (no external load equipment)
 */
export function isBodyweightExercise(exercise: Exercise): boolean {
  const allEquipment = [...(exercise.equipmentAll || []), ...(exercise.equipmentAny || []), ...exercise.equipment];
  if (allEquipment.length === 0) return true;

  return allEquipment.every((eq) => {
    const cls = getEquipmentClass(eq);
    return cls === 'bodyweight' || cls === 'other';
  });
}

/**
 * Check if user has required equipment for an exercise
 * - equipmentAll: ALL must be present
 * - equipmentAny: at least ONE must be present (if non-empty)
 * - legacy equipment: treat as ANY-of (user needs at least one)
 * - if no equipment required, always allowed
 */
export function hasEquipment(exercise: Exercise, availableEquipment: string[]): boolean {
  const available = new Set(availableEquipment.map((e) => e.toLowerCase()));

  // Check equipmentAll - ALL must be present
  if (exercise.equipmentAll && exercise.equipmentAll.length > 0) {
    const hasAll = exercise.equipmentAll.every((eq) => available.has(eq.toLowerCase()));
    if (!hasAll) return false;
  }

  // Check equipmentAny - at least ONE must be present (if specified)
  if (exercise.equipmentAny && exercise.equipmentAny.length > 0) {
    const hasAny = exercise.equipmentAny.some((eq) => available.has(eq.toLowerCase()));
    if (!hasAny) return false;
  }

  // Check legacy equipment field - treat as ANY-of
  // Only apply if neither equipmentAll nor equipmentAny are specified
  if (!exercise.equipmentAll && !exercise.equipmentAny) {
    if (exercise.equipment.length === 0) {
      return true; // No equipment needed
    }
    // ANY-of logic for legacy equipment
    return exercise.equipment.some((eq) => available.has(eq.toLowerCase()));
  }

  return true;
}

// ============================================================================
// COMPOUND DETECTION (Task 3)
// ============================================================================

// Compound intents - multi-joint movements
const COMPOUND_INTENTS: MovementIntent[] = [
  'horizontal_press',
  'vertical_press',
  'horizontal_pull',
  'vertical_pull',
  'knee_dominant',
  'hip_hinge',
];

// Isolation-ish intents - single-joint or stability movements
const ISOLATION_INTENTS: MovementIntent[] = [
  'elbow_extension',
  'elbow_flexion',
  'trunk_stability',
  'shoulder_isolation',
  'carry',
  'conditioning',
];

/**
 * Determine if an exercise is compound based on its intents (deterministic)
 * A movement is compound if it includes any compound intent AND is not primarily isolation-ish
 */
export function isCompoundExercise(exercise: Exercise): boolean {
  const profile = getExerciseLoadingProfile(exercise);
  if (profile.compoundClassification === 'isolation') {
    return false;
  }
  if (profile.compoundClassification === 'compound') {
    return true;
  }

  const hasCompoundIntent = exercise.intents.some((i) => COMPOUND_INTENTS.includes(i));
  const hasIsolationIntent = exercise.intents.some((i) => ISOLATION_INTENTS.includes(i));

  // If it has compound intents, it's compound (even if also has isolation intents for accessory work)
  // Unless it ONLY has isolation intents
  if (hasCompoundIntent) {
    return true;
  }

  // Primary isolation movements
  if (hasIsolationIntent && !hasCompoundIntent) {
    return false;
  }

  return false;
}

/**
 * Determine exercise priority based on intents and compound detection (Task 3)
 */
function determinePriority(exercise: Exercise, intents: MovementIntent[], goalWeights: GoalWeights): ExercisePriority {
  const isCompound = isCompoundExercise(exercise);

  // Primary movements: compound exercises with primary intents
  const primaryIntents: MovementIntent[] = [
    'horizontal_press',
    'vertical_press',
    'horizontal_pull',
    'vertical_pull',
    'knee_dominant',
    'hip_hinge',
  ];

  const matchesCompoundIntent = intents.some((i) => primaryIntents.includes(i));

  if (isCompound && matchesCompoundIntent) {
    return 'primary';
  }

  // Accessory: compound but not primary intent, or multi-muscle isolation
  if (isCompound || exercise.musclesPrimary.length >= 2) {
    return 'accessory';
  }

  // Isolation: single-joint, single muscle focus
  return 'isolation';
}

// ============================================================================
// CATALOG ACCESS
// ============================================================================

/**
 * Load exercise catalog
 */
export function getExerciseCatalog(): Exercise[] {
  return exercises;
}

/**
 * Get exercise by ID
 */
export function getExerciseById(id: string): Exercise | null {
  return exercises.find((e) => e.id === id) || null;
}

/**
 * Get all exercises
 */
export function listExercises(): Exercise[] {
  return [...exercises];
}

/**
 * Get exercises by intent
 */
export function getExercisesByIntent(intent: MovementIntent): Exercise[] {
  return exercises.filter((e) => e.intents.includes(intent));
}

// ============================================================================
// SCORING & SELECTION
// ============================================================================

/**
 * Score an exercise for selection based on intent, constraints, and user state
 */
function scoreExercise(
  exercise: Exercise,
  intent: MovementIntent,
  constraints: TrainingConstraints,
  userState: UserState,
  goalWeights: GoalWeights,
  alreadySelected: string[],
  selectionHints?: SessionSelectionHints,
): ExerciseScore {
  let score = 0;
  const reasons: string[] = [];

  // Intent match (required)
  if (!exercise.intents.includes(intent)) {
    return { exerciseId: exercise.id, score: 0, reasons: ['Does not match required intent'] };
  }
  score += 100;
  reasons.push('Matches required intent');

  const roleTier = getPrimarySlotRoleTier(exercise, intent);
  if (selectionHints?.primarySlotMaxTier !== undefined) {
    if (roleTier > selectionHints.primarySlotMaxTier) {
      return {
        exerciseId: exercise.id,
        score: 0,
        reasons: [`Primary-slot role tier ${roleTier} exceeds max ${selectionHints.primarySlotMaxTier} for this slot`],
      };
    }
  }

  if (roleTier === PrimarySlotRoleTier.Skill && !constraints.preferences?.includeSkillWork) {
    return {
      exerciseId: exercise.id,
      score: 0,
      reasons: ['Skill-tier movement excluded unless skill work is enabled in setup'],
    };
  }

  // Deprioritize technique / finisher defaults (e.g. 21s) for normal compound-hypertrophy work
  const loadProfile = getExerciseLoadingProfile(exercise);
  if (loadProfile.defaultSelectionTier === 'avoid_default_progression') {
    score -= 120;
    reasons.push('Deprioritized: technique/finisher not default progression');
  }

  // Equipment availability (Task 1 - use new hasEquipment helper)
  if (!hasEquipment(exercise, constraints.availableEquipment)) {
    return { exerciseId: exercise.id, score: 0, reasons: ['Required equipment not available'] };
  }
  score += 50;
  reasons.push('Equipment available');

  // Contraindications
  const hasContraindication = exercise.contraindications.some((c) => constraints.injuries.includes(c));
  if (hasContraindication) {
    return { exerciseId: exercise.id, score: 0, reasons: ['Contraindicated due to injury'] };
  }
  score += 30;
  reasons.push('No contraindications');

  // Forbidden movements
  const hasForbiddenIntent = exercise.intents.some((i) => constraints.forbiddenMovements.includes(i));
  if (hasForbiddenIntent) {
    return { exerciseId: exercise.id, score: 0, reasons: ['Contains forbidden movement'] };
  }
  score += 30;
  reasons.push('No forbidden movements');

  // Experience level match
  const levelScores: Record<ExperienceLevel, number> = { beginner: 1, intermediate: 2, advanced: 3 };
  const userLevel = levelScores[userState.experienceLevel];
  const exerciseLevel = levelScores[exercise.difficulty];
  const levelDiff = Math.abs(userLevel - exerciseLevel);
  if (levelDiff === 0) {
    score += 40;
    reasons.push('Perfect difficulty match');
  } else if (levelDiff === 1) {
    score += 20;
    reasons.push('Appropriate difficulty');
  } else {
    score -= 20;
    reasons.push('Difficulty mismatch');
  }

  // Preference: machines vs free weights (Task 2 - use proper classification)
  if (constraints.preferences?.prefersMachines && isMachineBiased(exercise)) {
    score += 15;
    reasons.push('Matches machine preference');
  }
  if (constraints.preferences?.prefersFreeWeights && isFreeWeightBiased(exercise)) {
    score += 15;
    reasons.push('Matches free weight preference');
  }

  // Avoid duplicates
  if (alreadySelected.includes(exercise.id)) {
    score -= 50;
    reasons.push('Already selected in session');
  }

  // Hated exercises
  if (constraints.preferences?.hatesExercises?.includes(exercise.id)) {
    score -= 30;
    reasons.push('User dislikes this exercise');
  }

  // Compound movements get bonus (Task 3 - use proper compound detection)
  const intentIsCompoundPattern = (
    intent === 'horizontal_press' ||
    intent === 'vertical_press' ||
    intent === 'horizontal_pull' ||
    intent === 'vertical_pull' ||
    intent === 'knee_dominant' ||
    intent === 'hip_hinge'
  );
  if (intentIsCompoundPattern && isCompoundExercise(exercise)) {
    score += 25;
    reasons.push('Compound movement');
  }

  // Priority intent bonus (Task 5)
  if (constraints.priorityIntents?.includes(intent)) {
    score += 10;
    reasons.push('Priority intent bonus');
  }

  if (selectionHints) {
    const { delta, tags } = selectionQualityDelta(exercise, intent, selectionHints);
    score += delta;
    const tagCap = Math.min(6, tags.length);
    for (let i = 0; i < tagCap; i++) {
      reasons.push(tags[i]);
    }
  }

  return { exerciseId: exercise.id, score: Math.max(0, score), reasons };
}

/**
 * Choose exercise for a given intent
 */
export function chooseExercise(input: ChooseExerciseInput): Exercise[] {
  const { intent, constraints, userState, goalWeights, alreadySelected, selectionHints } = input;

  const candidates = getExercisesByIntent(intent);

  const scored = candidates
    .map((ex) =>
      scoreExercise(ex, intent, constraints, userState, goalWeights, alreadySelected, selectionHints),
    )
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => getExerciseById(s.exerciseId)!).filter(Boolean);
}

/**
 * Expand swap suggestions beyond the top sorted list (shared tags / primary muscles), re-scored with the same slot hints.
 */
function enrichRankedAlternatives(
  selected: Exercise,
  intent: MovementIntent,
  orderedCandidates: Exercise[],
  input: {
    template: SessionTemplate;
    phase: 'required' | 'optional';
    requiredOrdinal: number;
    usedCoreSubtypes: CoreSubtype[];
    constraints: TrainingConstraints;
    userState: UserState;
    goalWeights: GoalWeights;
    alreadySelected: string[];
  },
): { ids: string[]; names: string[]; alternativesSummary: Array<{ name: string; reason: string }> } {
  const hints: SessionSelectionHints = {
    template: input.template,
    phase: input.phase,
    requiredOrdinal: input.requiredOrdinal,
    usedCoreSubtypes: input.usedCoreSubtypes,
  };
  const pool = new Map<string, Exercise>();
  for (const ex of orderedCandidates.slice(1)) {
    pool.set(ex.id, ex);
  }
  const tagSet = new Set(selected.substitutionTags);
  for (const ex of getExercisesByIntent(intent)) {
    if (ex.id === selected.id) continue;
    if (!hasEquipment(ex, input.constraints.availableEquipment)) continue;
    const hasContra = ex.contraindications.some((c) => input.constraints.injuries.includes(c));
    if (hasContra) continue;
    const hasForbidden = ex.intents.some((i) => input.constraints.forbiddenMovements.includes(i));
    if (hasForbidden) continue;
    const shareTag = ex.substitutionTags.some((t) => tagSet.has(t));
    const shareMuscle = ex.musclesPrimary.some((m) => selected.musclesPrimary.includes(m));
    if (shareTag || shareMuscle) {
      pool.set(ex.id, ex);
    }
  }
  const compoundSwapOrdering =
    COMPOUND_INTENTS.includes(intent) &&
    (input.phase === 'required' || input.phase === 'optional');

  const scored = [...pool.values()]
    .map((ex) => ({
      ex,
      s: scoreExercise(
        ex,
        intent,
        input.constraints,
        input.userState,
        input.goalWeights,
        input.alreadySelected,
        hints,
      ),
    }))
    .filter((x) => x.s.score > 0 && x.ex.id !== selected.id)
    .sort((a, b) => {
      if (compoundSwapOrdering) {
        const ta = getPrimarySlotRoleTier(a.ex, intent);
        const tb = getPrimarySlotRoleTier(b.ex, intent);
        if (ta !== tb) return ta - tb;
      }
      return b.s.score - a.s.score;
    })
    .slice(0, 12);

  return {
    ids: scored.map((x) => x.ex.id),
    names: scored.map((x) => x.ex.name),
    alternativesSummary: scored.slice(0, 5).map((x, idx) => ({
      name: x.ex.name,
      reason: x.s.reasons[0] ?? `Compatible alternative #${idx + 1}`,
    })),
  };
}

// ============================================================================
// REP RANGES, SETS, REST
// ============================================================================

/**
 * Get rep range for exercise based on goal weights and priority
 */
function getNormalizedGoalEntries(goalWeights: GoalWeights): Array<{ goal: TrainingGoal; weight: number; rules: any }> {
  const entries = Object.entries(goalWeights).filter(([, w]) => w && w > 0) as [TrainingGoal, number][];
  const withRules = entries
    .map(([goal, weight]) => ({ goal, weight, rules: rules.goals[goal] }))
    .filter((e) => !!e.rules);
  const sum = withRules.reduce((acc, e) => acc + e.weight, 0);
  if (sum <= 0) return [];
  return withRules.map((e) => ({ ...e, weight: e.weight / sum }));
}

function getBlendedRepRange(priority: ExercisePriority, goalWeights: GoalWeights): [number, number] | null {
  const entries = getNormalizedGoalEntries(goalWeights);
  if (entries.length === 0) return null;
  const lower = entries.reduce((acc, e) => acc + e.weight * e.rules.repRanges[priority][0], 0);
  const upper = entries.reduce((acc, e) => acc + e.weight * e.rules.repRanges[priority][1], 0);
  const lowRounded = Math.max(1, Math.round(lower));
  const highRounded = Math.max(lowRounded, Math.round(upper));
  return [lowRounded, highRounded];
}

function getBlendedSets(priority: ExercisePriority, goalWeights: GoalWeights): number | null {
  const entries = getNormalizedGoalEntries(goalWeights);
  if (entries.length === 0) return null;
  const blended = entries.reduce((acc, e) => acc + e.weight * e.rules.setsPerIntent[priority], 0);
  return Math.max(1, Math.round(blended));
}

function getBlendedRest(priority: ExercisePriority, goalWeights: GoalWeights): number | null {
  const entries = getNormalizedGoalEntries(goalWeights);
  if (entries.length === 0) return null;
  const blended = entries.reduce((acc, e) => acc + e.weight * e.rules.restSeconds[priority], 0);
  return Math.max(1, Math.round(blended / 5) * 5);
}

function getRepRange(priority: ExercisePriority, goalWeights: GoalWeights): [number, number] {
  const blended = getBlendedRepRange(priority, goalWeights);
  if (blended) return blended;

  // Find dominant goal
  const goalEntries = Object.entries(goalWeights).filter(([, w]) => w && w > 0) as [TrainingGoal, number][];
  if (goalEntries.length === 0) {
    return [8, 12]; // default
  }

  goalEntries.sort(([, a], [, b]) => b - a);
  const dominantGoal = goalEntries[0][0];

  const goalRules = rules.goals[dominantGoal];
  if (!goalRules) {
    return [8, 12];
  }

  const repRanges = goalRules.repRanges;
  if (priority === 'primary') {
    return repRanges.primary as [number, number];
  } else if (priority === 'accessory') {
    return repRanges.accessory as [number, number];
  } else {
    return repRanges.isolation as [number, number];
  }
}

/**
 * Get sets per exercise based on priority and goal
 */
function shouldApplyLowFrequencyIsolationBump(
  exercise: Exercise,
  priority: ExercisePriority,
  weeklyMuscleSessionCounts?: Record<string, number>,
): boolean {
  if (priority !== 'isolation') return false;
  const bumpRule = rules.lowFrequencyIsolationBump;
  if (!bumpRule || !weeklyMuscleSessionCounts) return false;
  const maxSessions = bumpRule.maxSessionsPerWeekForBump ?? 1;
  const primaries = exercise.musclesPrimary ?? [];
  if (primaries.length === 0) return false;
  return primaries.some((m) => (weeklyMuscleSessionCounts[m] ?? 0) <= maxSessions);
}

function getSetsPerExercise(
  priority: ExercisePriority,
  goalWeights: GoalWeights,
  options?: { bumpIsolation?: boolean },
): number {
  const blended = getBlendedSets(priority, goalWeights);
  let sets: number;
  if (blended !== null) {
    sets = blended;
  } else {

    const goalEntries = Object.entries(goalWeights).filter(([, w]) => w && w > 0) as [TrainingGoal, number][];
    if (goalEntries.length === 0) {
      sets = 3;
    } else {
      goalEntries.sort(([, a], [, b]) => b - a);
      const dominantGoal = goalEntries[0][0];
      const goalRules = rules.goals[dominantGoal];
      if (!goalRules) {
        sets = 3;
      } else {
        const setsPerIntent = goalRules.setsPerIntent;
        if (priority === 'primary') {
          sets = setsPerIntent.primary;
        } else if (priority === 'accessory') {
          sets = setsPerIntent.accessory;
        } else {
          sets = setsPerIntent.isolation;
        }
      }
    }
  }

  if (options?.bumpIsolation && priority === 'isolation') {
    const extra = rules.lowFrequencyIsolationBump?.extraIsolationSets ?? 1;
    sets += extra;
  }
  return sets;
}

type ExercisePrescriptionOverride = {
  fixedTargetReps?: number;
  minSets?: number;
};

export function getExercisePrescriptionOverride(exercise: Exercise): ExercisePrescriptionOverride {
  // "21s" is not a generic curl prescription: represent it as 21 total reps (7-7-7)
  // and avoid degenerate one-set outputs that read as nonsense for this movement.
  if (exercise.id === '21s') {
    return { fixedTargetReps: 21, minSets: 2 };
  }

  // Guardrail: avoid one-set elbow flexion accessories in base generation.
  if (exercise.intents.includes('elbow_flexion')) {
    return { minSets: 2 };
  }

  return {};
}

function getExerciseSetFloor(exercise: Exercise): number {
  return getExercisePrescriptionOverride(exercise).minSets ?? 1;
}

function carryDistanceMetersFromRepRange(repRange: [number, number]): number {
  const mid = (repRange[0] + repRange[1]) / 2;
  const meters = Math.round(20 + mid * 2.2);
  return Math.max(25, Math.min(60, meters));
}

function timeHoldSecondsFromRepRange(repRange: [number, number]): number {
  const mid = (repRange[0] + repRange[1]) / 2;
  const seconds = Math.round(mid * 3.5);
  return Math.max(25, Math.min(90, seconds));
}

function getExerciseTargetReps(
  exercise: Exercise,
  repRange: [number, number],
): number {
  const override = getExercisePrescriptionOverride(exercise);
  if (override.fixedTargetReps !== undefined) {
    return override.fixedTargetReps;
  }

  const profile = getExerciseLoadingProfile(exercise);
  if (profile.prescriptionType === 'carry_distance') {
    return carryDistanceMetersFromRepRange(repRange);
  }
  if (profile.prescriptionType === 'time_hold') {
    return timeHoldSecondsFromRepRange(repRange);
  }

  return Math.floor((repRange[0] + repRange[1]) / 2);
}

/**
 * Get rest time based on priority and goal
 */
function getRestSeconds(priority: ExercisePriority, goalWeights: GoalWeights): number {
  const blended = getBlendedRest(priority, goalWeights);
  if (blended !== null) return blended;

  const goalEntries = Object.entries(goalWeights).filter(([, w]) => w && w > 0) as [TrainingGoal, number][];
  if (goalEntries.length === 0) {
    return 90;
  }

  goalEntries.sort(([, a], [, b]) => b - a);
  const dominantGoal = goalEntries[0][0];

  const goalRules = rules.goals[dominantGoal];
  if (!goalRules) {
    return 90;
  }

  const restSeconds = goalRules.restSeconds;
  if (priority === 'primary') {
    return restSeconds.primary;
  } else if (priority === 'accessory') {
    return restSeconds.accessory;
  } else {
    return restSeconds.isolation;
  }
}

// ============================================================================
// LOADING SUGGESTIONS (Task 4)
// ============================================================================

/**
 * Double progression + RPE decision for one exercise from user history.
 * Single source of truth for next-session load AND the user-facing reason.
 */
export function deriveProgressionDecision(
  exercise: Exercise,
  userState: UserState,
  repRange: [number, number],
): DoubleProgressionDecision | null {
  const lastPerf = userState.lastSessionPerformance?.[exercise.id];
  const lastSets = (lastPerf?.sets ?? []).filter((s) => s.reps > 0 || s.weight > 0);
  if (lastSets.length === 0) return null;

  const history = userState.recentSessionPerformance?.[exercise.id];
  const holdStreak =
    history && history.length > 0
      ? countHoldStreak(
          history.map((h) => ({ sets: h.sets })),
          repRange,
        )
      : 1;

  return decideDoubleProgression({ exercise, lastSets, repRange, holdStreak });
}

/**
 * Suggest loading (weight) for an exercise with progression logic
 * Task 4: Fix vertical pull, use priority for rep ranges, fix bodyweight vs machine defaults
 */
export function suggestLoading(input: SuggestLoadingInput): number {
  const { exercise, userState, goalWeights, plannedReps, priority = 'primary' } = input;

  // Double progression + RPE from actual history (primary path): the last
  // session's result decides increase / hold / deload — never a formula
  // re-derivation that can bounce the load around.
  const repRange = getRepRange(priority, goalWeights);
  const decision = deriveProgressionDecision(exercise, userState, repRange);
  if (decision) {
    return decision.nextWeight;
  }

  // Use explicit 1RM baseline if provided (no history yet)
  if (userState.estimated1RM?.[exercise.id]) {
    const oneRM = userState.estimated1RM[exercise.id];
    const suggested = oneRM / (1 + plannedReps / 30);
    const step = getWeightStep(exercise);
    return Math.round(suggested / step) * step;
  }

  // Task 4a & 4c: Conservative defaults with bodyweight vs machine awareness
  // Bodyweight exercises (pull_up_bar, floor, rings) default to 0
  const isBW = isBodyweightExercise(exercise);

  // Defaults per intent AND equipment type
  const defaults: Record<ExperienceLevel, Record<string, { bodyweight: number; machine: number; freeWeight: number }>> = {
    beginner: {
      horizontal_press: { bodyweight: 0, machine: 25, freeWeight: 20 },
      vertical_press: { bodyweight: 0, machine: 20, freeWeight: 15 },
      horizontal_pull: { bodyweight: 0, machine: 25, freeWeight: 20 },
      vertical_pull: { bodyweight: 0, machine: 30, freeWeight: 0 }, // Lat pulldown uses machine default
      knee_dominant: { bodyweight: 0, machine: 40, freeWeight: 30 },
      hip_hinge: { bodyweight: 0, machine: 30, freeWeight: 40 },
      elbow_extension: { bodyweight: 0, machine: 15, freeWeight: 10 },
      elbow_flexion: { bodyweight: 0, machine: 12, freeWeight: 8 },
      trunk_stability: { bodyweight: 0, machine: 0, freeWeight: 0 },
      shoulder_isolation: { bodyweight: 0, machine: 8, freeWeight: 8 },
      carry: { bodyweight: 0, machine: 0, freeWeight: 15 },
      conditioning: { bodyweight: 0, machine: 0, freeWeight: 0 },
    },
    intermediate: {
      horizontal_press: { bodyweight: 0, machine: 50, freeWeight: 60 },
      vertical_press: { bodyweight: 0, machine: 35, freeWeight: 40 },
      horizontal_pull: { bodyweight: 0, machine: 45, freeWeight: 50 },
      vertical_pull: { bodyweight: 0, machine: 50, freeWeight: 0 }, // Lat pulldown uses machine default
      knee_dominant: { bodyweight: 0, machine: 80, freeWeight: 80 },
      hip_hinge: { bodyweight: 0, machine: 60, freeWeight: 100 },
      elbow_extension: { bodyweight: 0, machine: 25, freeWeight: 20 },
      elbow_flexion: { bodyweight: 0, machine: 20, freeWeight: 15 },
      trunk_stability: { bodyweight: 0, machine: 0, freeWeight: 0 },
      shoulder_isolation: { bodyweight: 0, machine: 12, freeWeight: 12 },
      carry: { bodyweight: 0, machine: 0, freeWeight: 25 },
      conditioning: { bodyweight: 0, machine: 0, freeWeight: 0 },
    },
    advanced: {
      horizontal_press: { bodyweight: 0, machine: 80, freeWeight: 100 },
      vertical_press: { bodyweight: 0, machine: 60, freeWeight: 70 },
      horizontal_pull: { bodyweight: 0, machine: 75, freeWeight: 90 },
      vertical_pull: { bodyweight: 0, machine: 70, freeWeight: 0 }, // Lat pulldown uses machine default
      knee_dominant: { bodyweight: 0, machine: 140, freeWeight: 140 },
      hip_hinge: { bodyweight: 0, machine: 100, freeWeight: 180 },
      elbow_extension: { bodyweight: 0, machine: 40, freeWeight: 35 },
      elbow_flexion: { bodyweight: 0, machine: 30, freeWeight: 25 },
      trunk_stability: { bodyweight: 0, machine: 0, freeWeight: 0 },
      shoulder_isolation: { bodyweight: 0, machine: 16, freeWeight: 16 },
      carry: { bodyweight: 0, machine: 0, freeWeight: 40 },
      conditioning: { bodyweight: 0, machine: 0, freeWeight: 0 },
    },
  };

  const loadProfile = getExerciseLoadingProfile(exercise);
  const loadKey = loadProfile.loadingIntentKey;
  const level = userState.experienceLevel;

  /** Thruster = hybrid press/squat — never use full squat defaults. */
  if (loadKey === 'thruster_blend') {
    const d = defaults[level];
    let blended: number;
    if (isMachineBiased(exercise)) {
      blended = d.vertical_press.machine * 0.42 + d.knee_dominant.machine * 0.22;
    } else {
      blended = d.vertical_press.freeWeight * 0.42 + d.knee_dominant.freeWeight * 0.22;
    }
    const step = getWeightStep(exercise);
    const rounded = Math.round(blended / step) * step;
    return Math.max(getMinimumWeight(exercise), rounded);
  }

  const intentDefaults = defaults[level]?.[loadKey as keyof (typeof defaults)['beginner']];

  if (!intentDefaults) {
    // For bodyweight exercises, always return 0 (weight is your body)
    if (isBW) return 0;
    const minWeight = getMinimumWeight(exercise);
    return Math.max(0, minWeight);
  }

  let defaultWeight: number;
  if (isBW) {
    // Bodyweight exercises: the "weight" is always 0 (your body is the load)
    return 0;
  } else if (isMachineBiased(exercise)) {
    defaultWeight = intentDefaults.machine;
  } else {
    defaultWeight = intentDefaults.freeWeight;
  }

  const minWeight = getMinimumWeight(exercise);
  return Math.max(defaultWeight, minWeight);
}

// ============================================================================
// SESSION BUILDING
// ============================================================================

/**
 * Build a complete session plan
 */
export function buildSession(input: BuildSessionInput): SessionPlan {
  const { template, goals, constraints, userState, weeklyMuscleSessionCounts, adaptiveTrainingEnabled } =
    input;
  const adaptiveOn = adaptiveTrainingEnabled === true;

  const templateRules = rules.sessionTemplates[template];
  if (!templateRules) {
    throw new Error(`Unknown template: ${template}`);
  }

  const requiredIntents = (
    input.intentOverrides && input.intentOverrides.length > 0
      ? input.intentOverrides
      : templateRules.requiredIntents
  ) as MovementIntent[];
  const optionalIntents = templateRules.optionalIntents as MovementIntent[];

  // Task 5: Reorder required intents so priorityIntents come first
  let orderedRequiredIntents = [...requiredIntents];
  if (constraints.priorityIntents && constraints.priorityIntents.length > 0) {
    const prioritized = orderedRequiredIntents.filter((i) => constraints.priorityIntents!.includes(i));
    const nonPrioritized = orderedRequiredIntents.filter((i) => !constraints.priorityIntents!.includes(i));
    orderedRequiredIntents = [...prioritized, ...nonPrioritized];
  }

  const exercises: PlannedExercise[] = [];
  const selectedExerciseIds: string[] = [];
  let orderIndex = 0;
  let optionalIndex = 0;
  const usedOptionalIntents = new Set<MovementIntent>();
  const skippedOptionalIntents = new Set<MovementIntent>();
  const skippedRequiredIntents = new Set<MovementIntent>();
  const primaryMuscleCounts = new Map<string, number>();

  const trackPrimaryMuscles = (exercise: Exercise) => {
    const primary = exercise.musclesPrimary || [];
    for (const muscle of primary) {
      primaryMuscleCounts.set(muscle, (primaryMuscleCounts.get(muscle) ?? 0) + 1);
    }
  };

  // Build constraintsApplied for decision trace (Task 6)
  const constraintsApplied: string[] = [
    ...constraints.injuries.map((i) => `injury: ${i}`),
    ...constraints.forbiddenMovements.map((m) => `forbidden: ${m}`),
    `equipment: ${constraints.availableEquipment.join(', ')}`,
  ];

  // Add preferences to constraintsApplied
  if (constraints.preferences?.prefersMachines) {
    constraintsApplied.push('preference: machines');
  }
  if (constraints.preferences?.prefersFreeWeights) {
    constraintsApplied.push('preference: free weights');
  }
  if (constraints.preferences?.hatesExercises?.length) {
    constraintsApplied.push(`hated: ${constraints.preferences.hatesExercises.join(', ')}`);
  }

  const isNonLegTemplate = template === 'push' || template === 'pull' || template === 'upper';
  const excludeLegDominant = (exs: Exercise[]) =>
    isNonLegTemplate ? exs.filter((ex) => !ex.intents.includes('knee_dominant') && !ex.intents.includes('hip_hinge')) : exs;

  const usedCoreSubtypes: CoreSubtype[] = [];

  // Select primary exercises for required intents first
  for (let ri = 0; ri < orderedRequiredIntents.length; ri++) {
    const intent = orderedRequiredIntents[ri];
    let candidates: Exercise[] = [];
    let primarySlotGateNote: string | undefined;

    const hintsPrePick: SessionSelectionHints = {
      template,
      phase: 'required',
      requiredOrdinal: ri,
      usedCoreSubtypes: [...usedCoreSubtypes],
    };

    if (shouldApplyPrimarySlotGate(intent)) {
      for (const maxTier of primarySlotTierRelaxationSequence()) {
        const gatedHints: SessionSelectionHints = {
          ...hintsPrePick,
          primarySlotMaxTier: maxTier,
        };
        candidates = chooseExercise({
          intent,
          constraints,
          userState,
          goalWeights: goals,
          alreadySelected: selectedExerciseIds,
          selectionHints: gatedHints,
        });
        candidates = excludeLegDominant(candidates);
        if (candidates.length > 0) {
          if (maxTier > PrimarySlotRoleTier.SecondaryCompound) {
            primarySlotGateNote = `Primary-slot gate relaxed to max tier ${PrimarySlotRoleTier[maxTier]} (${maxTier}): no better-matched options under current equipment/constraints.`;
          }
          break;
        }
      }
      if (candidates.length === 0) {
        const openHints: SessionSelectionHints = { ...hintsPrePick };
        delete openHints.primarySlotMaxTier;
        candidates = chooseExercise({
          intent,
          constraints,
          userState,
          goalWeights: goals,
          alreadySelected: selectedExerciseIds,
          selectionHints: openHints,
        });
        candidates = excludeLegDominant(candidates);
        if (candidates.length > 0) {
          primarySlotGateNote =
            'Primary-slot tier gate removed: no candidates matched within tier limits for this profile.';
        }
      }
    } else {
      candidates = chooseExercise({
        intent,
        constraints,
        userState,
        goalWeights: goals,
        alreadySelected: selectedExerciseIds,
        selectionHints: hintsPrePick,
      });
      candidates = excludeLegDominant(candidates);
    }

    if (candidates.length === 0) {
      skippedRequiredIntents.add(intent);
      continue; // Skip if no valid exercises
    }

    const selected = candidates[0];
    const priority = determinePriority(selected, [intent], goals);
    const repRange = getRepRange(priority, goals);
    const isolationBump = shouldApplyLowFrequencyIsolationBump(selected, priority, weeklyMuscleSessionCounts);
    const sets = Math.max(
      getSetsPerExercise(priority, goals, { bumpIsolation: isolationBump }),
      getExerciseSetFloor(selected),
    );
    const restSeconds = getRestSeconds(priority, goals);
    const targetReps = getExerciseTargetReps(selected, repRange);

    const baseWeight = suggestLoading({
      exercise: selected,
      userState,
      goalWeights: goals,
      plannedReps: targetReps,
      priority, // Pass priority for correct rep range evaluation
    });
    const { weight: suggestedWeight, reason: adaptiveReason } = applyOptionalAdaptiveLoadBias(
      baseWeight,
      selected,
      userState,
      adaptiveOn,
    );
    const plannedSets: PlannedSet[] = Array.from({ length: sets }, (_, i) => ({
      setIndex: i + 1,
      targetReps,
      suggestedWeight,
      restSeconds,
    }));

    // Progression reason (double progression + RPE) — same decision as suggestLoading.
    const progressionDecision = deriveProgressionDecision(selected, userState, repRange);
    const progressionReason = [progressionDecision?.reason, adaptiveReason].filter(Boolean).join(' ') || undefined;

    const selQ = selectionQualityDelta(selected, intent, hintsPrePick);
    const enriched = enrichRankedAlternatives(selected, intent, candidates, {
      template,
      phase: 'required',
      requiredOrdinal: ri,
      usedCoreSubtypes: hintsPrePick.usedCoreSubtypes,
      constraints,
      userState,
      goalWeights: goals,
      alreadySelected: selectedExerciseIds,
    });
    const alternativesSummary = enriched.alternativesSummary;
    const whyNotTopAlt =
      enriched.names.length > 0
        ? `${enriched.names[0]} was a close alternative; ${selected.name} better matches program-quality defaults and your profile.`
        : undefined;

    const decisionTrace: DecisionTrace = {
      intent: [intent],
      goalBias: goals,
      constraintsApplied,
      selectionReason: `Primary ${intent} — top pick from ${candidates.length} valid options (strength/hypertrophy default).`,
      rankedAlternatives: enriched.names,
      rankedAlternativeIds: enriched.ids,
      selectionTags: selQ.tags.slice(0, 12),
      alternativesSummary,
      confidence: candidates.length > 0 ? 0.9 : 0.5,
      progressionReason,
      whyNotTopAlt,
      selectionPhase: 'required',
      ...(primarySlotGateNote ? { primarySlotGateNote } : {}),
    };

    exercises.push({
      exerciseId: selected.id,
      exercise: selected,
      orderIndex: orderIndex++,
      priority,
      intents: [intent],
      plannedSets,
      decisionTrace,
    });

    selectedExerciseIds.push(selected.id);
    trackPrimaryMuscles(selected);
    if (intent === 'trunk_stability') {
      usedCoreSubtypes.push(getCoreSubtype(selected));
    }
  }

  // Add accessory/isolation exercises for variety
  const maxExercises = rules.experienceLevels[userState.experienceLevel].maxExercises;
  let optionalSlotIx = 0;
  while (exercises.length < maxExercises && optionalIntents.length > 0) {
    if (usedOptionalIntents.size + skippedOptionalIntents.size >= optionalIntents.length) {
      break;
    }
    let intent: MovementIntent | null = null;
    let attempts = 0;
    while (attempts < optionalIntents.length) {
      const candidate = optionalIntents[optionalIndex % optionalIntents.length];
      optionalIndex += 1;
      attempts += 1;
      if (usedOptionalIntents.has(candidate) || skippedOptionalIntents.has(candidate)) continue;
      intent = candidate;
      break;
    }
    if (!intent) break;
    const optHints: SessionSelectionHints = {
      template,
      phase: 'optional',
      requiredOrdinal: optionalSlotIx,
      usedCoreSubtypes: [...usedCoreSubtypes],
    };
    let candidates = chooseExercise({
      intent,
      constraints,
      userState,
      goalWeights: goals,
      alreadySelected: selectedExerciseIds,
      selectionHints: optHints,
    });
    candidates = excludeLegDominant(candidates);

    if (candidates.length === 0) {
      skippedOptionalIntents.add(intent);
      continue;
    }

    const overused = new Set<string>();
    primaryMuscleCounts.forEach((count, muscle) => {
      if (count >= 2) overused.add(muscle);
    });
    const balancedCandidates =
      overused.size > 0
        ? candidates.filter((ex) => !(ex.musclesPrimary || []).some((m) => overused.has(m)))
        : candidates;
    const eligibleCandidates = balancedCandidates.length > 0 ? balancedCandidates : candidates;
    const selected = eligibleCandidates[0];
    const priority = determinePriority(selected, [intent], goals);
    const repRange = getRepRange(priority, goals);
    const isolationBumpOpt = shouldApplyLowFrequencyIsolationBump(selected, priority, weeklyMuscleSessionCounts);
    const sets = Math.max(
      getSetsPerExercise(priority, goals, { bumpIsolation: isolationBumpOpt }),
      getExerciseSetFloor(selected),
    );
    const restSeconds = getRestSeconds(priority, goals);
    const targetReps = getExerciseTargetReps(selected, repRange);

    const baseWeightOpt = suggestLoading({
      exercise: selected,
      userState,
      goalWeights: goals,
      plannedReps: targetReps,
      priority,
    });
    const { weight: suggestedWeightOpt } = applyOptionalAdaptiveLoadBias(
      baseWeightOpt,
      selected,
      userState,
      adaptiveOn,
    );
    const plannedSets: PlannedSet[] = Array.from({ length: sets }, (_, i) => ({
      setIndex: i + 1,
      targetReps,
      suggestedWeight: suggestedWeightOpt,
      restSeconds,
    }));

    const selQOpt = selectionQualityDelta(selected, intent, optHints);
    const enrichedOpt = enrichRankedAlternatives(selected, intent, eligibleCandidates, {
      template,
      phase: 'optional',
      requiredOrdinal: optionalSlotIx,
      usedCoreSubtypes: optHints.usedCoreSubtypes,
      constraints,
      userState,
      goalWeights: goals,
      alreadySelected: selectedExerciseIds,
    });
    const alternativesSummary = enrichedOpt.alternativesSummary;
    const whyNotTopAlt =
      enrichedOpt.names.length > 0
        ? `${enrichedOpt.names[0]} available — picked ${selected.name} for balance / slot role.`
        : undefined;

    const decisionTrace: DecisionTrace = {
      intent: [intent],
      goalBias: goals,
      constraintsApplied,
      selectionReason: `Accessory / volume slot for ${intent} (hypertrophy & balance).`,
      rankedAlternatives: enrichedOpt.names,
      rankedAlternativeIds: enrichedOpt.ids,
      selectionTags: selQOpt.tags.slice(0, 12),
      alternativesSummary,
      confidence: 0.7,
      whyNotTopAlt,
      selectionPhase: 'optional',
    };

    exercises.push({
      exerciseId: selected.id,
      exercise: selected,
      orderIndex: orderIndex++,
      priority,
      intents: [intent],
      plannedSets,
      decisionTrace,
    });

    selectedExerciseIds.push(selected.id);
    usedOptionalIntents.add(intent);
    trackPrimaryMuscles(selected);
    if (intent === 'trunk_stability') {
      usedCoreSubtypes.push(getCoreSubtype(selected));
    }
    optionalSlotIx += 1;
  }

  // Estimate duration
  const warmupMinutes = rules.timeBudget.warmupMinutes;
  const cooldownMinutes = rules.timeBudget.cooldownMinutes;
  const orderedExercises = sortPlannedExercisesCoachOrder(exercises, template, constraints);
  const perExerciseMinutes = orderedExercises.reduce((sum, ex) => {
    const mins = ex.priority === 'primary' ? 8 : ex.priority === 'accessory' ? 5 : 3;
    return sum + mins;
  }, 0);
  const estimatedDurationMinutes = warmupMinutes + perExerciseMinutes + cooldownMinutes;

  return {
    id: `session_${Date.now()}`,
    template,
    goals,
    constraints,
    userState,
    exercises: orderedExercises,
    estimatedDurationMinutes,
    createdAt: new Date().toISOString(),
    ...(skippedRequiredIntents.size > 0
      ? { skippedOverrideIntents: [...skippedRequiredIntents] as MovementIntent[] }
      : {}),
  };
}

// ============================================================================
// SESSION ADAPTATION
// ============================================================================

/**
 * Adapt session during workout with autoregulation
 */
export function adaptSession(input: AdaptSessionInput): SessionPlan {
  const { sessionState, reason } = input;
  const { plan, skippedExercises, elapsedTimeSeconds, loggedSets } = sessionState;

  const remainingExercises = plan.exercises.filter((ex) => !skippedExercises.includes(ex.exerciseId));

  // Detect fatigue from logged sets
  const fatigueLevels: Record<string, number> = {};
  for (const ex of remainingExercises) {
    const sets = loggedSets[ex.exerciseId] || [];
    if (sets.length > 0) {
      const fatigue = detectFatigue(
        ex.exerciseId,
        sets.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe })),
      );
      fatigueLevels[ex.exerciseId] = fatigue;
    }
  }

  // If time pressure, reduce sets or remove lowest priority exercises
  if (reason === 'time_pressure') {
    const elapsedMinutes = elapsedTimeSeconds / 60;
    const remainingBudget = plan.constraints.timeBudgetMinutes - elapsedMinutes;
    let estimatedRemaining = remainingExercises.reduce((sum, ex) => {
      const mins = ex.priority === 'primary' ? 8 : ex.priority === 'accessory' ? 5 : 3;
      return sum + mins;
    }, 0);

    if (estimatedRemaining > remainingBudget) {
      // Remove lowest priority exercises first
      const sorted = [...remainingExercises].sort((a, b) => {
        const priorityOrder = { primary: 3, accessory: 2, isolation: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      while (estimatedRemaining > remainingBudget && sorted.length > 0) {
        const removed = sorted.pop()!;
        remainingExercises.splice(
          remainingExercises.findIndex((e) => e.exerciseId === removed.exerciseId),
          1,
        );
        const removedMins = removed.priority === 'primary' ? 8 : removed.priority === 'accessory' ? 5 : 3;
        estimatedRemaining -= removedMins;
      }
    }

    // Reduce sets on remaining exercises
    remainingExercises.forEach((ex) => {
      const minSets = getExerciseSetFloor(ex.exercise);
      if (ex.priority === 'isolation' && ex.plannedSets.length > minSets) {
        ex.plannedSets = ex.plannedSets.slice(0, minSets);
      } else if (ex.priority === 'accessory' && ex.plannedSets.length > 2) {
        ex.plannedSets = ex.plannedSets.slice(0, 2);
      }
    });
  }

  // If fatigue detected, reduce volume or switch to lower-fatigue variant
  if (reason === 'fatigue' || Object.values(fatigueLevels).some((f) => f > 0.5)) {
    remainingExercises.forEach((ex) => {
      const fatigue = fatigueLevels[ex.exerciseId] || 0;
      if (fatigue > 0.7) {
        // Severe fatigue: reduce sets significantly
        const minSets = getExerciseSetFloor(ex.exercise);
        ex.plannedSets = ex.plannedSets.slice(0, Math.max(minSets, Math.floor(ex.plannedSets.length * 0.5)));
      } else if (fatigue > 0.5) {
        // Moderate fatigue: reduce sets moderately
        const minSets = getExerciseSetFloor(ex.exercise);
        ex.plannedSets = ex.plannedSets.slice(0, Math.max(minSets, Math.floor(ex.plannedSets.length * 0.7)));
      } else if (reason === 'fatigue') {
        // General fatigue signal
        const minSets = getExerciseSetFloor(ex.exercise);
        if (ex.plannedSets.length > minSets) {
          ex.plannedSets = ex.plannedSets.slice(0, Math.max(minSets, Math.floor(ex.plannedSets.length * 0.7)));
        }
      }
    });
  }

  // Recalculate estimated duration
  const warmupMinutes = rules.timeBudget.warmupMinutes;
  const cooldownMinutes = rules.timeBudget.cooldownMinutes;
  const perExerciseMinutes = remainingExercises.reduce((sum, ex) => {
    const mins = ex.priority === 'primary' ? 8 : ex.priority === 'accessory' ? 5 : 3;
    return sum + mins;
  }, 0);
  const estimatedDurationMinutes = warmupMinutes + perExerciseMinutes + cooldownMinutes;

  return {
    ...plan,
    exercises: remainingExercises,
    estimatedDurationMinutes,
  };
}

// ============================================================================
// PROGRAM DAY SESSION BUILDING
// ============================================================================

/**
 * Build session from a program day
 * Uses existing buildSession logic but with program day context
 * @param programDay - Program day with intents and template
 * @param profileSnapshot - User profile snapshot from program
 * @returns Session plan
 */
export function buildSessionFromProgramDay(
  programDay: {
    label: string;
    intents: MovementIntent[];
    template_key: SessionTemplate;
  },
  profileSnapshot: TrainingProfileSnapshot,
  options?: { weeklyMuscleSessionCounts?: Record<string, number>; adaptiveTrainingEnabled?: boolean },
): SessionPlan {
  // Use existing buildSession with program day's template and intents
  const hasIntentOverrides = Array.isArray(programDay.intents) && programDay.intents.length > 0;
  const profilePrefs = profileSnapshot.constraints?.preferences ?? {};
  const input: BuildSessionInput = {
    template: programDay.template_key,
    goals: profileSnapshot.goals,
    constraints: {
      availableEquipment: profileSnapshot.equipment_access,
      injuries: profileSnapshot.constraints?.injuries || [],
      forbiddenMovements: (profileSnapshot.constraints?.forbiddenMovements || []) as MovementIntent[],
      timeBudgetMinutes: 60,
      priorityIntents: hasIntentOverrides ? programDay.intents : undefined,
      preferences: {
        includeSkillWork: profilePrefs.includeSkillWork === true,
        muscle_frequency_preference: profilePrefs.muscle_frequency_preference,
        prefersMachines: profilePrefs.prefersMachines,
        prefersFreeWeights: profilePrefs.prefersFreeWeights,
        hatesExercises: profilePrefs.hatesExercises,
      },
    },
    userState: {
      experienceLevel: profileSnapshot.experienceLevel ?? 'intermediate',
      estimated1RM: profileSnapshot.baselines || {},
      lastSessionPerformance: profileSnapshot.lastSessionPerformance,
      recentSessionPerformance: profileSnapshot.recentSessionPerformance,
    },
    intentOverrides: hasIntentOverrides ? programDay.intents : undefined,
    weeklyMuscleSessionCounts: options?.weeklyMuscleSessionCounts,
    adaptiveTrainingEnabled: options?.adaptiveTrainingEnabled === true,
  };

  const plan = buildSession(input);

  // Task 7: Attach program day label to plan for display
  return {
    ...plan,
    sessionLabel: programDay.label,
  };
}

export { getExerciseLoadingProfile } from '../exerciseLoadingProfile';
export { formatPlannedSetSummary, formatExercisePreviewLine, formatLoadSemanticsSuffix } from '../loadDisplayFormat';
