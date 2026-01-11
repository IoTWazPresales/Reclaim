/**
 * Session Runtime Tests
 * 
 * Tests for the session state machine including:
 * - Initialization and resumption
 * - Set logging with autoregulation
 * - Exercise skipping
 * - Session ending
 */

import { describe, it, expect } from 'vitest';
import {
  initializeRuntime,
  logSet,
  advanceExercise,
  skipExercise,
  endSession,
  getAdjustedSetParams,
  getSessionStats,
} from '../sessionRuntime';
import type { SessionPlan, PlannedExercise } from '../../types';

// Helper to create a minimal session plan for testing
function createTestPlan(exercises: Partial<PlannedExercise>[]): SessionPlan {
  return {
    id: 'test_session_123',
    template: 'push',
    goals: { build_muscle: 1 },
    constraints: {
      availableEquipment: ['barbell', 'dumbbells'],
      injuries: [],
      forbiddenMovements: [],
      timeBudgetMinutes: 60,
    },
    userState: {
      experienceLevel: 'intermediate',
    },
    exercises: exercises.map((ex, idx) => ({
      exerciseId: ex.exerciseId || `exercise_${idx}`,
      exercise: {
        id: ex.exerciseId || `exercise_${idx}`,
        name: ex.exercise?.name || `Test Exercise ${idx}`,
        aliases: [],
        intents: ['horizontal_press'],
        equipment: ['barbell'],
        musclesPrimary: ['chest'],
        musclesSecondary: [],
        difficulty: 'intermediate',
        contraindications: [],
        substitutionTags: [],
        unilateral: false,
      },
      orderIndex: idx,
      priority: 'primary',
      intents: ['horizontal_press'],
      plannedSets: ex.plannedSets || [
        { setIndex: 1, targetReps: 8, suggestedWeight: 60, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 60, restSeconds: 90 },
        { setIndex: 3, targetReps: 8, suggestedWeight: 60, restSeconds: 90 },
      ],
      decisionTrace: {
        intent: ['horizontal_press'],
        goalBias: { build_muscle: 1 },
        constraintsApplied: [],
        selectionReason: 'Test',
        rankedAlternatives: [],
        confidence: 1,
      },
    })) as PlannedExercise[],
    estimatedDurationMinutes: 45,
    createdAt: new Date().toISOString(),
  };
}

describe('Session Runtime - Initialization', () => {
  it('should initialize runtime state from session plan', () => {
    const plan = createTestPlan([{ exerciseId: 'bench_press' }]);
    const state = initializeRuntime('session_123', plan, 'manual');
    
    expect(state.sessionId).toBe('session_123');
    expect(state.mode).toBe('manual');
    expect(state.status).toBe('active');
    expect(state.currentExerciseIndex).toBe(0);
    expect(Object.keys(state.exerciseStates)).toHaveLength(1);
    expect(state.exerciseStates['bench_press'].status).toBe('pending');
    expect(state.exerciseStates['bench_press'].plannedSets).toHaveLength(3);
  });
  
  it('should initialize multiple exercises', () => {
    const plan = createTestPlan([
      { exerciseId: 'bench_press' },
      { exerciseId: 'incline_press' },
      { exerciseId: 'tricep_pushdown' },
    ]);
    const state = initializeRuntime('session_123', plan);
    
    expect(Object.keys(state.exerciseStates)).toHaveLength(3);
    expect(state.exerciseStates['bench_press']).toBeDefined();
    expect(state.exerciseStates['incline_press']).toBeDefined();
    expect(state.exerciseStates['tricep_pushdown']).toBeDefined();
  });
});

describe('Session Runtime - Set Logging', () => {
  it('should log a set and update exercise state', () => {
    const plan = createTestPlan([{ exerciseId: 'bench_press' }]);
    const initialState = initializeRuntime('session_123', plan);
    
    const result = logSet(initialState, 'bench_press', {
      setIndex: 1,
      weight: 60,
      reps: 8,
      rpe: 7,
    });
    
    expect(result.setEntry).toBeDefined();
    expect(result.setEntry.weight).toBe(60);
    expect(result.setEntry.reps).toBe(8);
    expect(result.setEntry.rpe).toBe(7);
    
    const exerciseState = result.state.exerciseStates['bench_press'];
    expect(exerciseState.completedSets).toHaveLength(1);
    expect(exerciseState.currentSetIndex).toBe(2);
    expect(exerciseState.status).toBe('in_progress');
  });
  
  it('should mark exercise complete after all sets', () => {
    const plan = createTestPlan([{ 
      exerciseId: 'bench_press',
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 60, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 60, restSeconds: 90 },
      ],
    }]);
    
    let state = initializeRuntime('session_123', plan);
    
    // Log first set
    const result1 = logSet(state, 'bench_press', {
      setIndex: 1, weight: 60, reps: 8, rpe: 7,
    });
    state = result1.state;
    
    // Log second set
    const result2 = logSet(state, 'bench_press', {
      setIndex: 2, weight: 60, reps: 8, rpe: 8,
    });
    state = result2.state;
    
    expect(state.exerciseStates['bench_press'].status).toBe('completed');
    expect(state.exerciseStates['bench_press'].completedSets).toHaveLength(2);
  });
  
  it('should track all logged sets in session', () => {
    const plan = createTestPlan([
      { exerciseId: 'bench_press' },
      { exerciseId: 'incline_press' },
    ]);
    
    let state = initializeRuntime('session_123', plan);
    
    // Log sets for both exercises
    state = logSet(state, 'bench_press', { setIndex: 1, weight: 60, reps: 8 }).state;
    state = logSet(state, 'incline_press', { setIndex: 1, weight: 40, reps: 10 }).state;
    
    expect(state.allLoggedSets).toHaveLength(2);
    expect(state.allLoggedSets[0].exerciseId).toBe('bench_press');
    expect(state.allLoggedSets[1].exerciseId).toBe('incline_press');
  });
});

describe('Session Runtime - Autoregulation', () => {
  it('should create adjustment for high RPE set', () => {
    const plan = createTestPlan([{ exerciseId: 'bench_press' }]);
    let state = initializeRuntime('session_123', plan);
    
    // Log first set with high RPE (9)
    const result = logSet(state, 'bench_press', {
      setIndex: 1,
      weight: 60,
      reps: 8,
      rpe: 9, // High RPE should trigger adjustment
    });
    
    // Should have adjustment for next set
    expect(result.adjustment).toBeDefined();
    expect(result.adjustment?.ruleId).toContain('RPE');
    expect(result.adjustment?.confidence).toBeGreaterThan(0);
    
    // Trace should be recorded
    expect(result.trace).toBeDefined();
    expect(result.trace?.reason).toBe('high_rpe');
  });
  
  it('should store adjustment in exercise state', () => {
    const plan = createTestPlan([{ exerciseId: 'bench_press' }]);
    let state = initializeRuntime('session_123', plan);
    
    const result = logSet(state, 'bench_press', {
      setIndex: 1,
      weight: 60,
      reps: 8,
      rpe: 9,
    });
    
    state = result.state;
    
    // Adjustment should be stored for set index 2
    const exerciseState = state.exerciseStates['bench_press'];
    expect(exerciseState.adjustments[2]).toBeDefined();
  });
  
  it('should return adjusted params for next set', () => {
    const plan = createTestPlan([{ exerciseId: 'bench_press' }]);
    let state = initializeRuntime('session_123', plan);
    
    // Log set with high RPE
    state = logSet(state, 'bench_press', {
      setIndex: 1,
      weight: 60,
      reps: 8,
      rpe: 9,
    }).state;
    
    // Get adjusted params for next set
    const adjusted = getAdjustedSetParams(state, 'bench_press', 2);
    
    expect(adjusted.hasAdjustment).toBe(true);
    // Weight should be reduced (5% = 57kg, rounded)
    expect(adjusted.suggestedWeight).toBeLessThan(60);
    expect(adjusted.adjustmentMessage).toBeDefined();
  });
  
  it('should NOT adjust for low RPE', () => {
    const plan = createTestPlan([{ exerciseId: 'bench_press' }]);
    let state = initializeRuntime('session_123', plan);
    
    // Log set with low RPE
    const result = logSet(state, 'bench_press', {
      setIndex: 1,
      weight: 60,
      reps: 8,
      rpe: 6, // Low RPE - no need to reduce
    });
    
    // Should NOT have weight reduction adjustment
    if (result.adjustment) {
      expect(result.adjustment.weightMultiplier).toBeUndefined();
    }
  });
});

describe('Session Runtime - Exercise Management', () => {
  it('should advance to next exercise', () => {
    const plan = createTestPlan([
      { exerciseId: 'bench_press' },
      { exerciseId: 'incline_press' },
    ]);
    
    let state = initializeRuntime('session_123', plan);
    expect(state.currentExerciseIndex).toBe(0);
    
    state = advanceExercise(state, ['bench_press', 'incline_press']);
    expect(state.currentExerciseIndex).toBe(1);
  });
  
  it('should skip exercise with trace', () => {
    const plan = createTestPlan([{ exerciseId: 'bench_press' }]);
    let state = initializeRuntime('session_123', plan);
    
    const result = skipExercise(state, 'bench_press', 'equipment_unavailable');
    
    expect(result.state.exerciseStates['bench_press'].status).toBe('skipped');
    expect(result.state.exerciseStates['bench_press'].skipReason).toBe('equipment_unavailable');
    expect(result.trace.reason).toBe('user_override');
  });
});

describe('Session Runtime - Session Stats', () => {
  it('should compute session statistics', () => {
    const plan = createTestPlan([
      { exerciseId: 'bench_press' },
      { exerciseId: 'incline_press' },
    ]);
    
    let state = initializeRuntime('session_123', plan);
    
    // Log some sets
    state = logSet(state, 'bench_press', { setIndex: 1, weight: 60, reps: 8, rpe: 7 }).state;
    state = logSet(state, 'bench_press', { setIndex: 2, weight: 60, reps: 8, rpe: 8 }).state;
    state = skipExercise(state, 'incline_press', 'time').state;
    
    const stats = getSessionStats(state);
    
    expect(stats.completedExercises).toBe(1);
    expect(stats.skippedExercises).toBe(1);
    expect(stats.totalSets).toBe(2);
    expect(stats.totalVolume).toBe(60 * 8 * 2); // 960kg
    expect(stats.averageRpe).toBe(7.5);
  });
});

describe('Session Runtime - End Session', () => {
  it('should compute session result', () => {
    const plan = createTestPlan([
      { exerciseId: 'bench_press' },
      { exerciseId: 'incline_press' },
    ]);
    
    let state = initializeRuntime('session_123', plan);
    
    // Log sets
    state = logSet(state, 'bench_press', { setIndex: 1, weight: 60, reps: 8 }).state;
    state = logSet(state, 'bench_press', { setIndex: 2, weight: 60, reps: 8 }).state;
    state = skipExercise(state, 'incline_press', 'time').state;
    
    const result = endSession(state, {
      'bench_press': 'Bench Press',
      'incline_press': 'Incline Press',
    });
    
    expect(result.sessionId).toBe('session_123');
    expect(result.exercisesCompleted).toBe(1);
    expect(result.exercisesSkipped).toBe(1);
    expect(result.totalSets).toBe(2);
    expect(result.totalVolume).toBe(960);
    expect(result.adaptationTrace).toBeDefined();
  });
  
  it('should detect PRs when previous bests provided', () => {
    const plan = createTestPlan([{ exerciseId: 'bench_press' }]);
    let state = initializeRuntime('session_123', plan);
    
    // Log a heavy set
    state = logSet(state, 'bench_press', { setIndex: 1, weight: 100, reps: 5 }).state;
    
    const result = endSession(
      state,
      { 'bench_press': 'Bench Press' },
      {
        'bench_press': {
          bestWeight: 90, // Previous best was 90kg
          bestE1RM: 105,
        },
      },
    );
    
    // Should detect weight PR
    expect(result.prs.some(pr => pr.metric === 'weight')).toBe(true);
  });
});
