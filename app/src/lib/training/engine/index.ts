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
  calculateNextReps,
  detectFatigue,
  detectPRs,
  type PersonalRecord,
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
} from '../types';

const exercises = exercisesData as Exercise[];
const rules = rulesData as any;

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
 * Get exercises by intent
 */
export function getExercisesByIntent(intent: MovementIntent): Exercise[] {
  return exercises.filter((e) => e.intents.includes(intent));
}

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

  // Equipment availability
  const hasRequiredEquipment = exercise.equipment.every((eq) => constraints.availableEquipment.includes(eq));
  if (!hasRequiredEquipment) {
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

  // Preference: machines vs free weights
  if (constraints.preferences?.prefersMachines && exercise.equipment.some((e) => e.includes('machine'))) {
    score += 15;
    reasons.push('Matches machine preference');
  }
  if (constraints.preferences?.prefersFreeWeights && !exercise.equipment.some((e) => e.includes('machine'))) {
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

  // Compound movements get bonus
  const isCompound = exercise.musclesPrimary.length >= 3;
  if (isCompound) {
    score += 25;
    reasons.push('Compound movement');
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

/**
 * Determine exercise priority based on movement pattern and goal
 */
function determinePriority(exercise: Exercise, intents: MovementIntent[], goalWeights: GoalWeights): ExercisePriority {
  // Primary movements for strength/hypertrophy
  const primaryIntents: MovementIntent[] = ['horizontal_press', 'vertical_press', 'horizontal_pull', 'vertical_pull', 'knee_dominant', 'hip_hinge'];
  const isPrimaryIntent = intents.some((i) => primaryIntents.includes(i));

  if (isPrimaryIntent && exercise.musclesPrimary.length >= 3) {
    return 'primary';
  }

  if (exercise.musclesPrimary.length >= 2) {
    return 'accessory';
  }

  return 'isolation';
}

/**
 * Get rep range for exercise based on goal weights
 */
function getRepRange(priority: ExercisePriority, goalWeights: GoalWeights): [number, number] {
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

/**
 * Suggest loading (weight) for an exercise with progression logic
 */
export function suggestLoading(input: SuggestLoadingInput): number {
  const { exercise, userState, goalWeights, plannedReps } = input;

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

      // Get rep range for progression evaluation
      const repRange = getRepRange('primary', goalWeights); // Simplified - would need priority
      const progression = evaluateProgression(
        [{ targetReps: plannedReps, suggestedWeight: bestSet.weight }],
        lastSets,
        repRange,
      );

      const nextWeight = calculateNextWeight(bestSet.weight, progression, exercise);
      const step = getWeightStep(exercise);
      return Math.round(nextWeight / step) * step;
    }
  }

  // Conservative defaults based on exercise and experience
  const defaults: Record<ExperienceLevel, Record<string, number>> = {
    beginner: {
      horizontal_press: 20,
      vertical_press: 15,
      horizontal_pull: 20,
      vertical_pull: 0, // bodyweight
      knee_dominant: 30,
      hip_hinge: 40,
      elbow_extension: 10,
      elbow_flexion: 8,
      trunk_stability: 0,
      carry: 15,
      conditioning: 0,
    },
    intermediate: {
      horizontal_press: 60,
      vertical_press: 40,
      horizontal_pull: 50,
      vertical_pull: 0,
      knee_dominant: 80,
      hip_hinge: 100,
      elbow_extension: 20,
      elbow_flexion: 15,
      trunk_stability: 0,
      carry: 25,
      conditioning: 0,
    },
    advanced: {
      horizontal_press: 100,
      vertical_press: 70,
      horizontal_pull: 90,
      vertical_pull: 0,
      knee_dominant: 140,
      hip_hinge: 180,
      elbow_extension: 35,
      elbow_flexion: 25,
      trunk_stability: 0,
      carry: 40,
      conditioning: 0,
    },
  };

  const primaryIntent = exercise.intents[0];
  const defaultWeight = defaults[userState.experienceLevel]?.[primaryIntent] || 0;
  const minWeight = getMinimumWeight(exercise);
  return Math.max(defaultWeight, minWeight);
}

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

  const exercises: PlannedExercise[] = [];
  const selectedExerciseIds: string[] = [];
  let orderIndex = 0;

  // Allocate intents based on goal weights
  const allIntents = [...requiredIntents, ...optionalIntents];
  const intentAllocations: Record<MovementIntent, number> = {} as any;

  // Required intents get priority
  requiredIntents.forEach((intent) => {
    intentAllocations[intent] = (intentAllocations[intent] || 0) + 2;
  });

  // Optional intents get lower priority
  optionalIntents.forEach((intent) => {
    intentAllocations[intent] = (intentAllocations[intent] || 0) + 1;
  });

  // Select primary exercises for required intents first
  for (const intent of requiredIntents) {
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
        const repRange = getRepRange(priority, goals);
        const progression = evaluateProgression(
          [{ targetReps: Math.floor((repRange[0] + repRange[1]) / 2), suggestedWeight: bestSet.weight }],
          lastSets,
          repRange,
        );
        const nextWeight = calculateNextWeight(bestSet.weight, progression, selected);
        if (nextWeight > bestSet.weight) {
          progressionReason = `Progression: increased weight from ${bestSet.weight}kg to ${nextWeight}kg after hitting top of rep range.`;
        } else if (nextWeight < bestSet.weight) {
          progressionReason = `Adjustment: reduced weight from ${bestSet.weight}kg to ${nextWeight}kg due to previous difficulty.`;
        } else {
          progressionReason = `Maintained ${bestSet.weight}kg; continue building reps within target range.`;
        }
      }
    }

    const whyNotTopAlt = candidates.length > 1
      ? `${candidates[1].name} was second choice but ${selected.name} better matches equipment availability and experience level.`
      : undefined;

    const decisionTrace: DecisionTrace = {
      intent: [intent],
      goalBias: goals,
      constraintsApplied: [
        ...constraints.injuries,
        ...constraints.forbiddenMovements,
        `equipment: ${constraints.availableEquipment.join(', ')}`,
      ],
      selectionReason: `Primary ${intent} movement. Top candidate from ${candidates.length} options.`,
      rankedAlternatives: candidates.slice(1, 4).map((e) => e.name),
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
  }

  // Add accessory/isolation exercises for variety
  const maxExercises = rules.experienceLevels[userState.experienceLevel].maxExercises;
  while (exercises.length < maxExercises && optionalIntents.length > 0) {
    const intent = optionalIntents[exercises.length % optionalIntents.length];
    const candidates = chooseExercise({
      intent,
      constraints,
      userState,
      goalWeights: goals,
      alreadySelected: selectedExerciseIds,
    });

    if (candidates.length === 0) {
      break;
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
      }),
      restSeconds,
    }));

    const whyNotTopAlt = candidates.length > 1
      ? `${candidates[1].name} was considered but ${selected.name} provides better variety and equipment fit.`
      : undefined;

    const decisionTrace: DecisionTrace = {
      intent: [intent],
      goalBias: goals,
      constraintsApplied: [
        ...constraints.injuries,
        ...constraints.forbiddenMovements,
        `equipment: ${constraints.availableEquipment.join(', ')}`,
      ],
      selectionReason: `Accessory ${intent} movement for volume and variety.`,
      rankedAlternatives: candidates.slice(1, 3).map((e) => e.name),
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
    const estimatedRemaining = remainingExercises.reduce((sum, ex) => {
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
