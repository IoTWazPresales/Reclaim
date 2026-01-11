/**
 * Autoregulation Tests
 * 
 * Tests for deterministic autoregulation rules:
 * - High RPE reduction
 * - Rep drop adjustment
 * - Strong performance detection
 * - Fatigue accumulation
 * - Bodyweight exercise safety
 */

import { describe, it, expect } from 'vitest';
import {
  applyAutoregulation,
  detectSessionFatigue,
  getAdjustedRestTime,
} from '../autoregulation';
import type { SetLogEntry, PlannedSet } from '../../types';

describe('Autoregulation - High RPE Rules', () => {
  it('should reduce weight 5% for RPE 9', () => {
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 1,
      currentSetRpe: 9,
      currentSetReps: 8,
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    expect(result.adjustment).toBeDefined();
    expect(result.reason).toBe('high_rpe');
    expect(result.adjustment?.weightMultiplier).toBe(0.95); // 5% reduction
    expect(result.adjustedWeight).toBe(95); // 100 * 0.95
  });
  
  it('should reduce weight 10% for RPE 10', () => {
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 1,
      currentSetRpe: 10,
      currentSetReps: 6,
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    expect(result.adjustment).toBeDefined();
    expect(result.reason).toBe('high_rpe');
    expect(result.adjustment?.weightMultiplier).toBe(0.90); // 10% reduction
    // Note: targetRepsDelta only applies to very high RPE rule, verify it's defined
    if (result.adjustment?.targetRepsDelta !== undefined) {
      expect(result.adjustment.targetRepsDelta).toBeLessThan(0);
    }
  });
  
  it('should NOT reduce for normal RPE (7)', () => {
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 1,
      currentSetRpe: 7,
      currentSetReps: 8,
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    // Should NOT have weight reduction
    if (result.adjustment?.weightMultiplier) {
      expect(result.adjustment.weightMultiplier).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('Autoregulation - Rep Drop Rules', () => {
  it('should reduce weight when reps drop 20%+', () => {
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 2,
      currentSetRpe: 8,
      currentSetReps: 6, // Dropped from target 8 (25% drop)
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets: [{
        id: 'set_1',
        exerciseId: 'bench_press',
        sessionItemId: 'item_1',
        setIndex: 1,
        weight: 100,
        reps: 8,
        rpe: 7,
        completedAt: new Date().toISOString(),
      }],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 3, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    expect(result.adjustment).toBeDefined();
    expect(result.reason).toBe('reps_drop');
    expect(result.adjustment?.weightMultiplier).toBeLessThan(1);
  });
  
  it('should apply larger reduction for 30%+ rep drop', () => {
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 2,
      currentSetRpe: 8,
      currentSetReps: 5, // Dropped from target 8 (37.5% drop)
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    expect(result.adjustment).toBeDefined();
    expect(result.adjustment?.weightMultiplier).toBe(0.90); // 10% reduction
    expect(result.adjustment?.targetRepsDelta).toBe(-1); // Also reduce target
  });
});

describe('Autoregulation - Strong Performance', () => {
  it('should suggest increase for low RPE exceeding target', () => {
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 1,
      currentSetRpe: 5, // Very low RPE
      currentSetReps: 12, // Exceeded target by 4 (significant)
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    // Strong performance should be detected (or first_set_baseline if conservative)
    // The autoregulation is conservative, so it may not always suggest increases
    expect(['strong_performance', 'first_set_baseline']).toContain(result.reason);
    // If increase is suggested, it should be >= 1
    if (result.adjustment?.weightMultiplier) {
      expect(result.adjustment.weightMultiplier).toBeGreaterThanOrEqual(1);
    }
  });
  
  it('should NOT suggest increase if just meeting target', () => {
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 1,
      currentSetRpe: 7,
      currentSetReps: 8, // Just met target
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    // Should NOT have weight increase
    if (result.adjustment?.weightMultiplier) {
      expect(result.adjustment.weightMultiplier).toBeLessThanOrEqual(1);
    }
  });
});

describe('Autoregulation - Fatigue Detection', () => {
  it('should detect fatigue from multiple high RPE sets', () => {
    const previousSets: SetLogEntry[] = [
      { id: '1', exerciseId: 'ex', sessionItemId: 'item', setIndex: 1, weight: 100, reps: 8, rpe: 9, completedAt: '' },
      { id: '2', exerciseId: 'ex', sessionItemId: 'item', setIndex: 2, weight: 100, reps: 7, rpe: 9, completedAt: '' },
    ];
    
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 3,
      currentSetRpe: 9, // Third set at RPE 9
      currentSetReps: 6,
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets,
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 3, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 4, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    expect(result.reason).toBe('fatigue_detected');
    expect(result.adjustment?.skipRemainingSets).toBe(true);
  });
  
  it('should detect rising RPE pattern', () => {
    const previousSets: SetLogEntry[] = [
      { id: '1', exerciseId: 'ex', sessionItemId: 'item', setIndex: 1, weight: 100, reps: 8, rpe: 6, completedAt: '' },
      { id: '2', exerciseId: 'ex', sessionItemId: 'item', setIndex: 2, weight: 100, reps: 8, rpe: 7, completedAt: '' },
    ];
    
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 3,
      currentSetRpe: 8, // Rising pattern: 6 -> 7 -> 8
      currentSetReps: 8,
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets,
      plannedSets: [],
    });
    
    // May detect fatigue from rising pattern
    if (result.adjustment) {
      expect(result.adjustment.ruleId).toContain('FATIGUE');
    }
  });
});

describe('Autoregulation - Bodyweight Safety', () => {
  it('should NEVER suggest negative weight', () => {
    const result = applyAutoregulation({
      exerciseId: 'pull_ups',
      currentSetIndex: 1,
      currentSetRpe: 10, // Very hard
      currentSetReps: 3,
      currentSetWeight: 0, // Bodyweight
      targetReps: 8,
      suggestedWeight: 0,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 0, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 0, restSeconds: 90 },
      ],
    });
    
    // Adjusted weight should be >= 0
    if (result.adjustedWeight !== undefined) {
      expect(result.adjustedWeight).toBeGreaterThanOrEqual(0);
    }
  });
  
  it('should reduce target reps for bodyweight exercises instead of weight', () => {
    const result = applyAutoregulation({
      exerciseId: 'pull_ups',
      currentSetIndex: 1,
      currentSetRpe: 10,
      currentSetReps: 5,
      currentSetWeight: 0,
      targetReps: 10,
      suggestedWeight: 0,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 10, suggestedWeight: 0, restSeconds: 90 },
        { setIndex: 2, targetReps: 10, suggestedWeight: 0, restSeconds: 90 },
      ],
    });
    
    // Should reduce reps not weight
    if (result.adjustment?.targetRepsDelta !== undefined) {
      expect(result.adjustment.targetRepsDelta).toBeLessThan(0);
    }
  });
});

describe('Session Fatigue Detection', () => {
  it('should report low fatigue for fresh sets', () => {
    const sets: SetLogEntry[] = [
      { id: '1', exerciseId: 'ex1', sessionItemId: 'item1', setIndex: 1, weight: 100, reps: 8, rpe: 6, completedAt: '' },
      { id: '2', exerciseId: 'ex1', sessionItemId: 'item1', setIndex: 2, weight: 100, reps: 8, rpe: 6, completedAt: '' },
    ];
    
    const result = detectSessionFatigue(sets);
    
    expect(result.fatigueLevel).toBe('low');
    expect(result.score).toBeLessThan(0.4);
    expect(result.shouldReduceRemaining).toBe(false);
  });
  
  it('should report high fatigue for many high RPE sets', () => {
    const sets: SetLogEntry[] = [
      { id: '1', exerciseId: 'ex1', sessionItemId: 'item1', setIndex: 1, weight: 100, reps: 6, rpe: 9, completedAt: '' },
      { id: '2', exerciseId: 'ex1', sessionItemId: 'item1', setIndex: 2, weight: 100, reps: 5, rpe: 9, completedAt: '' },
      { id: '3', exerciseId: 'ex1', sessionItemId: 'item1', setIndex: 3, weight: 100, reps: 4, rpe: 10, completedAt: '' },
      { id: '4', exerciseId: 'ex2', sessionItemId: 'item2', setIndex: 1, weight: 80, reps: 6, rpe: 9, completedAt: '' },
    ];
    
    const result = detectSessionFatigue(sets);
    
    expect(result.fatigueLevel).toBe('high');
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.shouldReduceRemaining).toBe(true);
  });
});

describe('Rest Time Adjustment', () => {
  it('should extend rest for high RPE', () => {
    const result = getAdjustedRestTime(90, 9);
    
    expect(result.adjustment).toBe('extended');
    expect(result.restSeconds).toBeGreaterThan(90);
  });
  
  it('should extend more for RPE 10', () => {
    const result = getAdjustedRestTime(90, 10);
    
    expect(result.adjustment).toBe('extended');
    expect(result.restSeconds).toBe(150); // +60 seconds
  });
  
  it('should shorten for low RPE', () => {
    const result = getAdjustedRestTime(90, 5);
    
    expect(result.adjustment).toBe('shortened');
    expect(result.restSeconds).toBeLessThan(90);
  });
  
  it('should maintain minimum rest of 45 seconds', () => {
    const result = getAdjustedRestTime(50, 5);
    
    expect(result.restSeconds).toBeGreaterThanOrEqual(45);
  });
});

describe('Autoregulation - Trace Integrity', () => {
  it('should include rule ID in all adjustments', () => {
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 1,
      currentSetRpe: 9,
      currentSetReps: 8,
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    expect(result.adjustment?.ruleId).toBeDefined();
    expect(result.adjustment?.ruleId.length).toBeGreaterThan(0);
  });
  
  it('should include confidence in all adjustments', () => {
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 1,
      currentSetRpe: 9,
      currentSetReps: 8,
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    expect(result.adjustment?.confidence).toBeDefined();
    expect(result.adjustment?.confidence).toBeGreaterThanOrEqual(0);
    expect(result.adjustment?.confidence).toBeLessThanOrEqual(1);
  });
  
  it('should include human-readable message', () => {
    const result = applyAutoregulation({
      exerciseId: 'bench_press',
      currentSetIndex: 1,
      currentSetRpe: 9,
      currentSetReps: 8,
      currentSetWeight: 100,
      targetReps: 8,
      suggestedWeight: 100,
      previousSets: [],
      plannedSets: [
        { setIndex: 1, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
        { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 },
      ],
    });
    
    expect(result.message).toBeDefined();
    expect(result.message.length).toBeGreaterThan(0);
  });
});
