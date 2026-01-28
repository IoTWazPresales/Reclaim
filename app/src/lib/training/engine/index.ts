// Training engine - deterministic, explainable workout generation
import exercisesData from '../catalog/exercises.v1.json';
import rulesData from '../rules/rules.v1.json';
import {
  estimate1RM,
  getExerciseE1RM,
  getWeightStep,
  getMinimumWeight,
  evaluateProgression,
  calculateNextWeight,
  detectFatigue,
} from '../progression';
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
} from '../types';

const exercises = exercisesData as Exercise[];
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
const ISOLATION_INTENTS: MovementIntent[] = ['elbow_extension', 'elbow_flexion', 'trunk_stability', 'carry', 'conditioning'];

/**
 * Determine if an exercise is compound based on its intents (deterministic)
 * A movement is compound if it includes any compound intent AND is not primarily isolation-ish
 */
export function isCompoundExercise(exercise: Exercise): boolean {
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
): ExerciseScore {
  let score = 0;
  const reasons: string[] = [];

  // Intent match (required)
  if (!exercise.intents.includes(intent)) {
    return { exerciseId: exercise.id, score: 0, reasons: ['Does not match required intent'] };
  }
  score += 100;
  reasons.push('Matches required intent');

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
  if (isCompoundExercise(exercise)) {
    score += 25;
    reasons.push('Compound movement');
  }

  // Priority intent bonus (Task 5)
  if (constraints.priorityIntents?.includes(intent)) {
    score += 10;
    reasons.push('Priority intent bonus');
  }

  return { exerciseId: exercise.id, score: Math.max(0, score), reasons };
}

/**
 * Choose exercise for a given intent
 */
export function chooseExercise(input: ChooseExerciseInput): Exercise[] {
  const { intent, constraints, userState, goalWeights, alreadySelected } = input;

  const candidates = getExercisesByIntent(intent);

  const scored = candidates
    .map((ex) => scoreExercise(ex, intent, constraints, userState, goalWeights, alreadySelected))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => getExerciseById(s.exerciseId)!).filter(Boolean);
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
function getSetsPerExercise(priority: ExercisePriority, goalWeights: GoalWeights): number {
  const blended = getBlendedSets(priority, goalWeights);
  if (blended !== null) return blended;

  const goalEntries = Object.entries(goalWeights).filter(([, w]) => w && w > 0) as [TrainingGoal, number][];
  if (goalEntries.length === 0) {
    return 3;
  }

  goalEntries.sort(([, a], [, b]) => b - a);
  const dominantGoal = goalEntries[0][0];

  const goalRules = rules.goals[dominantGoal];
  if (!goalRules) {
    return 3;
  }

  const setsPerIntent = goalRules.setsPerIntent;
  if (priority === 'primary') {
    return setsPerIntent.primary;
  } else if (priority === 'accessory') {
    return setsPerIntent.accessory;
  } else {
    return setsPerIntent.isolation;
  }
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
 * Suggest loading (weight) for an exercise with progression logic
 * Task 4: Fix vertical pull, use priority for rep ranges, fix bodyweight vs machine defaults
 */
export function suggestLoading(input: SuggestLoadingInput): number {
  const { exercise, userState, goalWeights, plannedReps, priority = 'primary' } = input;

  // Compute e1RM from last performance if available
  const e1RM = getExerciseE1RM(exercise.id, userState.lastSessionPerformance);
  if (e1RM > 0) {
    // Use e1RM to calculate weight for target reps
    const suggested = e1RM / (1 + plannedReps / 30);
    const step = getWeightStep(exercise);
    return Math.round(suggested / step) * step;
  }

  // Use explicit 1RM if provided
  if (userState.estimated1RM?.[exercise.id]) {
    const oneRM = userState.estimated1RM[exercise.id];
    const suggested = oneRM / (1 + plannedReps / 30);
    const step = getWeightStep(exercise);
    return Math.round(suggested / step) * step;
  }

  // Use last session performance with progression
  if (userState.lastSessionPerformance?.[exercise.id]) {
    const lastPerf = userState.lastSessionPerformance[exercise.id];
    const lastSets = lastPerf.sets;
    if (lastSets.length > 0) {
      const bestSet = lastSets.reduce((best, set) => {
        const bestE1rm = estimate1RM(best.weight, best.reps);
        const setE1rm = estimate1RM(set.weight, set.reps);
        return setE1rm > bestE1rm ? set : best;
      }, lastSets[0]);

      // Task 4b: Use actual priority for rep range evaluation
      const repRange = getRepRange(priority, goalWeights);
      const progression = evaluateProgression(
        [{ targetReps: plannedReps, suggestedWeight: bestSet.weight }],
        lastSets,
        repRange,
      );

      const nextWeight = calculateNextWeight(
        bestSet.weight,
        progression === 'reduce_sets' ? 'maintain' : progression,
        exercise
      );
      const step = getWeightStep(exercise);
      return Math.round(nextWeight / step) * step;
    }
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
      carry: { bodyweight: 0, machine: 0, freeWeight: 40 },
      conditioning: { bodyweight: 0, machine: 0, freeWeight: 0 },
    },
  };

  const primaryIntent = exercise.intents[0];
  const intentDefaults = defaults[userState.experienceLevel]?.[primaryIntent];

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
  const { template, goals, constraints, userState } = input;

  const templateRules = rules.sessionTemplates[template];
  if (!templateRules) {
    throw new Error(`Unknown template: ${template}`);
  }

  const requiredIntents = templateRules.requiredIntents as MovementIntent[];
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

  // Select primary exercises for required intents first
  for (const intent of orderedRequiredIntents) {
    const candidates = chooseExercise({
      intent,
      constraints,
      userState,
      goalWeights: goals,
      alreadySelected: selectedExerciseIds,
    });

    if (candidates.length === 0) {
      continue; // Skip if no valid exercises
    }

    const selected = candidates[0];
    const priority = determinePriority(selected, [intent], goals);
    const repRange = getRepRange(priority, goals);
    const sets = getSetsPerExercise(priority, goals);
    const restSeconds = getRestSeconds(priority, goals);

    const plannedSets: PlannedSet[] = Array.from({ length: sets }, (_, i) => ({
      setIndex: i + 1,
      targetReps: Math.floor((repRange[0] + repRange[1]) / 2),
      suggestedWeight: suggestLoading({
        exercise: selected,
        userState,
        goalWeights: goals,
        plannedReps: Math.floor((repRange[0] + repRange[1]) / 2),
        priority, // Pass priority for correct rep range evaluation
      }),
      restSeconds,
    }));

    // Determine progression reason if we have last performance
    let progressionReason: string | undefined;
    if (userState.lastSessionPerformance?.[selected.id]) {
      const lastPerf = userState.lastSessionPerformance[selected.id];
      const lastSets = lastPerf.sets;
      if (lastSets.length > 0) {
        const bestSet = lastSets.reduce((best, set) => {
          const bestE1rm = estimate1RM(best.weight, best.reps);
          const setE1rm = estimate1RM(set.weight, set.reps);
          return setE1rm > bestE1rm ? set : best;
        }, lastSets[0]);
        const progression = evaluateProgression(
          [{ targetReps: Math.floor((repRange[0] + repRange[1]) / 2), suggestedWeight: bestSet.weight }],
          lastSets,
          repRange,
        );
        const nextWeight = calculateNextWeight(
          bestSet.weight,
          progression === 'reduce_sets' ? 'maintain' : progression,
          selected
        );
        if (nextWeight > bestSet.weight) {
          progressionReason = `Progression: increased weight from ${bestSet.weight}kg to ${nextWeight}kg after hitting top of rep range.`;
        } else if (nextWeight < bestSet.weight) {
          progressionReason = `Adjustment: reduced weight from ${bestSet.weight}kg to ${nextWeight}kg due to previous difficulty.`;
        } else {
          progressionReason = `Maintained ${bestSet.weight}kg; continue building reps within target range.`;
        }
      }
    }

    // Task 6: Generate top 3 alternatives with reason summary
    const alternativesSummary =
      candidates.length > 1
        ? candidates.slice(1, 4).map((alt, idx) => ({
            name: alt.name,
            reason:
              idx === 0
                ? `Ranked 2nd: lower score due to equipment fit or difficulty match`
                : `Ranked ${idx + 2}: provides similar muscle stimulus but slightly lower priority`,
          }))
        : [];

    const whyNotTopAlt =
      candidates.length > 1
        ? `${candidates[1].name} was second choice but ${selected.name} better matches equipment availability and experience level.`
        : undefined;

    const decisionTrace: DecisionTrace = {
      intent: [intent],
      goalBias: goals,
      constraintsApplied,
      selectionReason: `Primary ${intent} movement. Top candidate from ${candidates.length} options.`,
      rankedAlternatives: candidates.slice(1, 4).map((e) => e.name),
      alternativesSummary,
      confidence: candidates.length > 0 ? 0.9 : 0.5,
      progressionReason,
      whyNotTopAlt,
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
  }

  // Add accessory/isolation exercises for variety
  const maxExercises = rules.experienceLevels[userState.experienceLevel].maxExercises;
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
    const candidates = chooseExercise({
      intent,
      constraints,
      userState,
      goalWeights: goals,
      alreadySelected: selectedExerciseIds,
    });

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
    const sets = getSetsPerExercise(priority, goals);
    const restSeconds = getRestSeconds(priority, goals);

    const plannedSets: PlannedSet[] = Array.from({ length: sets }, (_, i) => ({
      setIndex: i + 1,
      targetReps: Math.floor((repRange[0] + repRange[1]) / 2),
      suggestedWeight: suggestLoading({
        exercise: selected,
        userState,
        goalWeights: goals,
        plannedReps: Math.floor((repRange[0] + repRange[1]) / 2),
        priority,
      }),
      restSeconds,
    }));

    const alternativesSummary =
      eligibleCandidates.length > 1
        ? eligibleCandidates.slice(1, 3).map((alt, idx) => ({
            name: alt.name,
            reason: `Alternative ${idx + 1}: similar effectiveness for ${intent}`,
          }))
        : [];

    const whyNotTopAlt =
      eligibleCandidates.length > 1
        ? `${eligibleCandidates[1].name} was considered but ${selected.name} provides better variety and equipment fit.`
        : undefined;

    const decisionTrace: DecisionTrace = {
      intent: [intent],
      goalBias: goals,
      constraintsApplied,
      selectionReason: `Accessory ${intent} movement for volume and variety.`,
      rankedAlternatives: eligibleCandidates.slice(1, 3).map((e) => e.name),
      alternativesSummary,
      confidence: 0.7,
      whyNotTopAlt,
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
  }

  // Estimate duration
  const warmupMinutes = rules.timeBudget.warmupMinutes;
  const cooldownMinutes = rules.timeBudget.cooldownMinutes;
  const perExerciseMinutes = exercises.reduce((sum, ex) => {
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
    exercises,
    estimatedDurationMinutes,
    createdAt: new Date().toISOString(),
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
      if (ex.priority === 'isolation' && ex.plannedSets.length > 1) {
        ex.plannedSets = ex.plannedSets.slice(0, 1);
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
        ex.plannedSets = ex.plannedSets.slice(0, Math.max(1, Math.floor(ex.plannedSets.length * 0.5)));
      } else if (fatigue > 0.5) {
        // Moderate fatigue: reduce sets moderately
        ex.plannedSets = ex.plannedSets.slice(0, Math.max(1, Math.floor(ex.plannedSets.length * 0.7)));
      } else if (reason === 'fatigue') {
        // General fatigue signal
        if (ex.plannedSets.length > 1) {
          ex.plannedSets = ex.plannedSets.slice(0, Math.max(1, Math.floor(ex.plannedSets.length * 0.7)));
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
  profileSnapshot: {
    goals: Record<TrainingGoal, number>;
    equipment_access: string[];
    constraints?: {
      injuries?: string[];
      forbiddenMovements?: string[];
    };
    baselines?: Record<string, number>;
  },
): SessionPlan {
  // Use existing buildSession with program day's template and intents
  const input: BuildSessionInput = {
    template: programDay.template_key,
    goals: profileSnapshot.goals,
    constraints: {
      availableEquipment: profileSnapshot.equipment_access,
      injuries: profileSnapshot.constraints?.injuries || [],
      forbiddenMovements: (profileSnapshot.constraints?.forbiddenMovements || []) as MovementIntent[],
      timeBudgetMinutes: 60,
      // Priority intents from program day - engine should focus on these
      priorityIntents: programDay.intents,
    },
    userState: {
      experienceLevel: 'intermediate',
      estimated1RM: profileSnapshot.baselines || {},
    },
  };

  const plan = buildSession(input);

  // Task 7: Attach program day label to plan for display
  return {
    ...plan,
    sessionLabel: programDay.label,
  };
}
