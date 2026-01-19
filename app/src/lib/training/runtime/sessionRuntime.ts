/**
 * Session Runtime State Machine
 * 
 * Manages the state of an active training session:
 * - Starting/resuming sessions
 * - Advancing through exercises and sets
 * - Logging sets with autoregulation
 * - Skipping exercises
 * - Ending sessions with summary
 * 
 * This module is STATELESS - all state is passed in and returned.
 * Network persistence happens via API functions in the calling code.
 */

import type {
  SessionRuntimeState,
  ExerciseRuntimeState,
  SetLogEntry,
  AdaptationTrace,
  AutoregulationAdjustment,
  SessionRuntimeResult,
  PlannedSet,
  PersonalRecord,
  SessionPlan,
  PlannedExercise,
  SessionMode,
} from '../types';
import { applyAutoregulation, detectSessionFatigue } from './autoregulation';
import { detectPRs } from '../progression';

/**
 * Initialize runtime state from a session plan
 */
export function initializeRuntime(
  sessionId: string,
  plan: SessionPlan,
  mode: SessionMode = 'manual',
): SessionRuntimeState {
  const now = new Date().toISOString();
  
  const exerciseStates: Record<string, ExerciseRuntimeState> = {};
  
  for (const exercise of plan.exercises) {
    const itemId = `${sessionId}_item_${exercise.orderIndex}`;
    exerciseStates[exercise.exerciseId] = {
      exerciseId: exercise.exerciseId,
      itemId,
      status: 'pending',
      plannedSets: exercise.plannedSets,
      completedSets: [],
      currentSetIndex: 1,
      adjustments: {},
    };
  }
  
  return {
    sessionId,
    startedAt: now,
    mode,
    currentExerciseIndex: 0,
    exerciseStates,
    allLoggedSets: [],
    adaptationTrace: [],
    elapsedSeconds: 0,
    lastTickAt: now,
    status: 'active',
  };
}

/**
 * Resume runtime state from persisted data
 */
export function resumeRuntime(
  sessionId: string,
  startedAt: string,
  mode: SessionMode,
  exercises: PlannedExercise[],
  existingSets: SetLogEntry[],
  skippedExerciseIds: string[],
): SessionRuntimeState {
  const now = new Date().toISOString();
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  
  const exerciseStates: Record<string, ExerciseRuntimeState> = {};
  
  for (const exercise of exercises) {
    const itemId = `${sessionId}_item_${exercise.orderIndex}`;
    const completedSets = existingSets.filter(s => s.exerciseId === exercise.exerciseId);
    const isSkipped = skippedExerciseIds.includes(exercise.exerciseId);
    
    exerciseStates[exercise.exerciseId] = {
      exerciseId: exercise.exerciseId,
      itemId,
      status: isSkipped ? 'skipped' : completedSets.length >= exercise.plannedSets.length ? 'completed' : 'pending',
      plannedSets: exercise.plannedSets,
      completedSets,
      currentSetIndex: completedSets.length + 1,
      adjustments: {},
    };
  }
  
  // Find first non-completed, non-skipped exercise
  let currentExerciseIndex = 0;
  for (let i = 0; i < exercises.length; i++) {
    const state = exerciseStates[exercises[i].exerciseId];
    if (state.status === 'pending') {
      currentExerciseIndex = i;
      break;
    }
    currentExerciseIndex = i;
  }
  
  return {
    sessionId,
    startedAt,
    mode,
    currentExerciseIndex,
    exerciseStates,
    allLoggedSets: existingSets,
    adaptationTrace: [], // Could persist/restore if needed
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    lastTickAt: now,
    status: 'active',
  };
}

/**
 * Update elapsed time (call periodically from UI timer)
 */
export function tickRuntime(state: SessionRuntimeState): SessionRuntimeState {
  if (state.status !== 'active') return state;
  
  const now = new Date();
  const lastTick = new Date(state.lastTickAt);
  const deltaSec = Math.floor((now.getTime() - lastTick.getTime()) / 1000);
  
  return {
    ...state,
    elapsedSeconds: state.elapsedSeconds + deltaSec,
    lastTickAt: now.toISOString(),
  };
}

/**
 * Log a completed set with autoregulation
 */
export function logSet(
  state: SessionRuntimeState,
  exerciseId: string,
  setData: {
    setIndex: number;
    weight: number;
    reps: number;
    rpe?: number;
  },
): {
  state: SessionRuntimeState;
  setEntry: SetLogEntry;
  adjustment?: AutoregulationAdjustment;
  trace?: AdaptationTrace;
} {
  const exerciseState = state.exerciseStates[exerciseId];
  if (!exerciseState) {
    throw new Error(`Exercise ${exerciseId} not found in session`);
  }
  
  const now = new Date().toISOString();
  const setId = `${exerciseState.itemId}_set_${setData.setIndex}_${Date.now()}`;
  
  // Get the planned set for this index
  const plannedSet = exerciseState.plannedSets.find(s => s.setIndex === setData.setIndex);
  
  // Check if there was an adjustment applied to this set
  const appliedAdjustment = exerciseState.adjustments[setData.setIndex];
  
  const setEntry: SetLogEntry = {
    id: setId,
    exerciseId,
    sessionItemId: exerciseState.itemId,
    setIndex: setData.setIndex,
    weight: setData.weight,
    reps: setData.reps,
    rpe: setData.rpe,
    completedAt: now,
    originalPlan: plannedSet ? {
      targetReps: plannedSet.targetReps,
      suggestedWeight: plannedSet.suggestedWeight,
    } : undefined,
    adjustmentApplied: appliedAdjustment,
  };
  
  // Calculate autoregulation for next set
  const nextSetIndex = setData.setIndex + 1;
  const hasNextSet = exerciseState.plannedSets.some(s => s.setIndex === nextSetIndex);
  
  let nextAdjustment: AutoregulationAdjustment | undefined;
  let adaptationEntry: AdaptationTrace | undefined;
  
  if (hasNextSet && setData.rpe !== undefined) {
    const nextPlannedSet = exerciseState.plannedSets.find(s => s.setIndex === nextSetIndex);
    if (nextPlannedSet) {
      const autoregResult = applyAutoregulation({
        exerciseId,
        currentSetIndex: setData.setIndex,
        currentSetRpe: setData.rpe,
        currentSetReps: setData.reps,
        currentSetWeight: setData.weight,
        targetReps: nextPlannedSet.targetReps,
        suggestedWeight: nextPlannedSet.suggestedWeight,
        previousSets: exerciseState.completedSets,
        plannedSets: exerciseState.plannedSets,
      });
      
      if (autoregResult.adjustment) {
        nextAdjustment = autoregResult.adjustment;
        adaptationEntry = {
          timestamp: now,
          exerciseId,
          setIndex: nextSetIndex,
          reason: autoregResult.reason,
          ruleId: autoregResult.adjustment.ruleId,
          input: {
            previousSetRpe: setData.rpe,
            previousSetReps: setData.reps,
            previousSetWeight: setData.weight,
            targetReps: nextPlannedSet.targetReps,
            suggestedWeight: nextPlannedSet.suggestedWeight,
          },
          output: {
            adjustedWeight: autoregResult.adjustedWeight,
            adjustedTargetReps: autoregResult.adjustedReps,
            message: autoregResult.adjustment.message,
          },
          confidence: autoregResult.adjustment.confidence,
        };
      }
    }
  }
  
  // Update exercise state
  const updatedCompletedSets = [...exerciseState.completedSets, setEntry];
  const isExerciseComplete = updatedCompletedSets.length >= exerciseState.plannedSets.length;
  
  const updatedExerciseState: ExerciseRuntimeState = {
    ...exerciseState,
    status: isExerciseComplete ? 'completed' : 'in_progress',
    completedSets: updatedCompletedSets,
    currentSetIndex: nextSetIndex,
    adjustments: nextAdjustment
      ? { ...exerciseState.adjustments, [nextSetIndex]: nextAdjustment }
      : exerciseState.adjustments,
  };
  
  const newState: SessionRuntimeState = {
    ...state,
    exerciseStates: {
      ...state.exerciseStates,
      [exerciseId]: updatedExerciseState,
    },
    allLoggedSets: [...state.allLoggedSets, setEntry],
    adaptationTrace: adaptationEntry
      ? [...state.adaptationTrace, adaptationEntry]
      : state.adaptationTrace,
  };
  
  return {
    state: newState,
    setEntry,
    adjustment: nextAdjustment,
    trace: adaptationEntry,
  };
}

/**
 * Advance to the next exercise
 */
export function advanceExercise(
  state: SessionRuntimeState,
  exerciseOrder: string[],
): SessionRuntimeState {
  const nextIndex = state.currentExerciseIndex + 1;
  
  if (nextIndex >= exerciseOrder.length) {
    return state; // Already at last exercise
  }
  
  // Mark current exercise as completed if it has sets, otherwise leave as pending
  const currentExerciseId = exerciseOrder[state.currentExerciseIndex];
  const currentExerciseState = state.exerciseStates[currentExerciseId];
  
  let updatedExerciseStates = state.exerciseStates;
  if (currentExerciseState && currentExerciseState.completedSets.length > 0) {
    updatedExerciseStates = {
      ...state.exerciseStates,
      [currentExerciseId]: {
        ...currentExerciseState,
        status: 'completed',
      },
    };
  }
  
  return {
    ...state,
    currentExerciseIndex: nextIndex,
    exerciseStates: updatedExerciseStates,
  };
}

/**
 * Skip an exercise
 */
export function skipExercise(
  state: SessionRuntimeState,
  exerciseId: string,
  reason: string = 'user_skipped',
): {
  state: SessionRuntimeState;
  trace: AdaptationTrace;
} {
  const exerciseState = state.exerciseStates[exerciseId];
  if (!exerciseState) {
    throw new Error(`Exercise ${exerciseId} not found in session`);
  }
  
  const now = new Date().toISOString();
  
  const trace: AdaptationTrace = {
    timestamp: now,
    exerciseId,
    setIndex: exerciseState.currentSetIndex,
    reason: 'user_override',
    ruleId: 'skip_exercise',
    input: {
      targetReps: exerciseState.plannedSets[0]?.targetReps || 0,
      suggestedWeight: exerciseState.plannedSets[0]?.suggestedWeight || 0,
    },
    output: {
      message: `Exercise skipped: ${reason}`,
    },
    confidence: 1.0,
  };
  
  const updatedExerciseState: ExerciseRuntimeState = {
    ...exerciseState,
    status: 'skipped',
    skipReason: reason,
  };
  
  return {
    state: {
      ...state,
      exerciseStates: {
        ...state.exerciseStates,
        [exerciseId]: updatedExerciseState,
      },
      adaptationTrace: [...state.adaptationTrace, trace],
    },
    trace,
  };
}

/**
 * End the session and compute final results
 */
export function endSession(
  state: SessionRuntimeState,
  exerciseNames: Record<string, string>,
  previousBests?: Record<string, {
    bestWeight?: number;
    bestReps?: number;
    bestE1RM?: number;
    bestVolume?: number;
  }>,
): SessionRuntimeResult {
  const now = new Date();
  const endedAt = now.toISOString();
  const startedAt = new Date(state.startedAt);
  const durationMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
  
  // Count exercises
  let exercisesCompleted = 0;
  let exercisesSkipped = 0;
  for (const exState of Object.values(state.exerciseStates)) {
    if (exState.status === 'completed' || exState.completedSets.length > 0) {
      exercisesCompleted++;
    } else if (exState.status === 'skipped') {
      exercisesSkipped++;
    }
  }
  
  // Calculate totals
  const totalSets = state.allLoggedSets.length;
  const totalVolume = state.allLoggedSets.reduce(
    (sum, set) => sum + (set.weight * set.reps),
    0,
  );
  
  // Detect PRs for each exercise
  const allPRs: PersonalRecord[] = [];
  const levelUpEvents: SessionRuntimeResult['levelUpEvents'] = [];
  
  for (const [exerciseId, exState] of Object.entries(state.exerciseStates)) {
    if (exState.completedSets.length === 0) continue;
    
    const exerciseName = exerciseNames[exerciseId] || exerciseId;
    const performedSets = exState.completedSets.map(s => ({
      weight: s.weight,
      reps: s.reps,
    }));
    
    const prs = detectPRs(
      exerciseId,
      exerciseName,
      performedSets,
      previousBests?.[exerciseId],
    );
    
    allPRs.push(...prs);
    
    // Create level-up events for PRs
    for (const pr of prs) {
      levelUpEvents.push({
        exerciseId: pr.exerciseId,
        exerciseName: pr.exerciseName,
        metric: pr.metric,
        value: pr.value,
        message: `New ${pr.metric === 'e1rm' ? 'e1RM' : pr.metric} PR: ${pr.value}${
          pr.metric === 'volume' ? 'kg total' : pr.metric === 'reps' ? ' reps' : 'kg'
        }`,
      });
    }
  }
  
  return {
    sessionId: state.sessionId,
    startedAt: state.startedAt,
    endedAt,
    durationMinutes,
    exercisesCompleted,
    exercisesSkipped,
    totalSets,
    totalVolume: Math.round(totalVolume),
    prs: allPRs,
    adaptationTrace: state.adaptationTrace,
    levelUpEvents,
  };
}

/**
 * Get the current exercise state
 */
export function getCurrentExercise(
  state: SessionRuntimeState,
  exerciseOrder: string[],
): ExerciseRuntimeState | null {
  const exerciseId = exerciseOrder[state.currentExerciseIndex];
  return exerciseId ? state.exerciseStates[exerciseId] : null;
}

/**
 * Get adjusted set parameters for a given set index
 */
export function getAdjustedSetParams(
  state: SessionRuntimeState,
  exerciseId: string,
  setIndex: number,
): {
  targetReps: number;
  suggestedWeight: number;
  hasAdjustment: boolean;
  adjustmentMessage?: string;
} {
  const exerciseState = state.exerciseStates[exerciseId];
  if (!exerciseState) {
    throw new Error(`Exercise ${exerciseId} not found`);
  }
  
  const plannedSet = exerciseState.plannedSets.find(s => s.setIndex === setIndex);
  if (!plannedSet) {
    throw new Error(`Set ${setIndex} not found for exercise ${exerciseId}`);
  }
  
  const adjustment = exerciseState.adjustments[setIndex];
  
  if (!adjustment) {
    return {
      targetReps: plannedSet.targetReps,
      suggestedWeight: plannedSet.suggestedWeight,
      hasAdjustment: false,
    };
  }
  
  let adjustedWeight = plannedSet.suggestedWeight;
  let adjustedReps = plannedSet.targetReps;
  
  if (adjustment.weightMultiplier !== undefined) {
    adjustedWeight = Math.round(adjustedWeight * adjustment.weightMultiplier * 2) / 2; // Round to 0.5kg
  }
  if (adjustment.weightDelta !== undefined) {
    adjustedWeight = adjustedWeight + adjustment.weightDelta;
  }
  if (adjustment.targetRepsDelta !== undefined) {
    adjustedReps = Math.max(1, adjustedReps + adjustment.targetRepsDelta);
  }
  
  // Ensure weight doesn't go negative
  adjustedWeight = Math.max(0, adjustedWeight);
  
  return {
    targetReps: adjustedReps,
    suggestedWeight: adjustedWeight,
    hasAdjustment: true,
    adjustmentMessage: adjustment.message,
  };
}

/**
 * Get session summary statistics (for UI during session)
 */
export function getSessionStats(state: SessionRuntimeState): {
  completedExercises: number;
  skippedExercises: number;
  totalSets: number;
  totalVolume: number;
  averageRpe: number | null;
} {
  let completedExercises = 0;
  let skippedExercises = 0;
  
  for (const exState of Object.values(state.exerciseStates)) {
    if (exState.status === 'completed' || exState.completedSets.length > 0) {
      completedExercises++;
    } else if (exState.status === 'skipped') {
      skippedExercises++;
    }
  }
  
  const totalSets = state.allLoggedSets.length;
  const totalVolume = state.allLoggedSets.reduce(
    (sum, set) => sum + (set.weight * set.reps),
    0,
  );
  
  const rpeSets = state.allLoggedSets.filter(s => s.rpe !== undefined);
  const averageRpe = rpeSets.length > 0
    ? rpeSets.reduce((sum, s) => sum + (s.rpe || 0), 0) / rpeSets.length
    : null;
  
  return {
    completedExercises,
    skippedExercises,
    totalSets,
    totalVolume: Math.round(totalVolume),
    averageRpe: averageRpe !== null ? Math.round(averageRpe * 10) / 10 : null,
  };
}
