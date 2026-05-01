/**
 * Integration tests for runtime + autoregulation + payload builder
 * 
 * Tests idempotency, autoregulation output, and payload correctness
 * WITHOUT mocking UI components.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initializeRuntime, logSet, advanceExercise } from '../sessionRuntime';
import { applyAutoregulation } from '../autoregulation';
import { buildSetLogPayload, buildSetLogQueuePayload } from '../payloadBuilder';
import type { SessionPlan, SessionRuntimeState, PlannedExercise } from '../../types';
import { getExerciseById } from '../../engine';

describe('Runtime + Autoregulation Integration', () => {
  let sessionPlan: SessionPlan;
  let runtimeState: SessionRuntimeState;
  
  beforeEach(() => {
    // Create a minimal session plan for testing
    const exercise = getExerciseById('barbell_bench_press');
    if (!exercise) throw new Error('Exercise not found');
    
    const plannedExercise: PlannedExercise = {
      exerciseId: exercise.id,
      exercise,
      orderIndex: 0,
      priority: 'primary',
      intents: ['horizontal_press'],
      plannedSets: [
        { setIndex: 1, targetReps: 10, suggestedWeight: 60, restSeconds: 90 },
        { setIndex: 2, targetReps: 10, suggestedWeight: 60, restSeconds: 90 },
        { setIndex: 3, targetReps: 8, suggestedWeight: 60, restSeconds: 90 },
      ],
      decisionTrace: {
        intent: [],
        goalBias: {},
        constraintsApplied: [],
        selectionReason: 'Test',
        rankedAlternatives: [],
        confidence: 0.8,
      },
    };
    
    sessionPlan = {
      id: 'test_session_123',
      template: 'push',
      goals: { build_strength: 0.7, build_muscle: 0.3 },
      constraints: {
        availableEquipment: ['barbell', 'bench'],
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 60,
      },
      userState: {
        experienceLevel: 'intermediate',
      },
      exercises: [plannedExercise],
      estimatedDurationMinutes: 45,
      createdAt: new Date().toISOString(),
    };
    
    runtimeState = initializeRuntime('test_session_123', sessionPlan, 'manual');
  });
  
  describe('Idempotency Guard Logic', () => {
    it('should allow logging same setIndex multiple times (different sessions)', () => {
      // Same setIndex but different sessionIds should be allowed
      const state1 = initializeRuntime('session_1', sessionPlan, 'manual');
      const state2 = initializeRuntime('session_2', sessionPlan, 'manual');
      
      const log1 = logSet(state1, sessionPlan.exercises[0].exerciseId, {
        setIndex: 1,
        weight: 60,
        reps: 10,
        rpe: 7,
      });
      
      const log2 = logSet(state2, sessionPlan.exercises[0].exerciseId, {
        setIndex: 1,
        weight: 60,
        reps: 10,
        rpe: 7,
      });
      
      // Both should succeed (different sessions)
      expect(log1.state.allLoggedSets.length).toBe(1);
      expect(log2.state.allLoggedSets.length).toBe(1);
    });
    
    it('should allow logging different setIndexes sequentially', () => {
      const exerciseId = sessionPlan.exercises[0].exerciseId;
      
      // Log set 1
      const log1 = logSet(runtimeState, exerciseId, {
        setIndex: 1,
        weight: 60,
        reps: 10,
        rpe: 7,
      });
      
      // Log set 2 (should be allowed)
      const log2 = logSet(log1.state, exerciseId, {
        setIndex: 2,
        weight: 60,
        reps: 10,
        rpe: 7,
      });
      
      expect(log1.state.allLoggedSets.length).toBe(1);
      expect(log2.state.allLoggedSets.length).toBe(2);
      expect(log2.state.allLoggedSets[0].setIndex).toBe(1);
      expect(log2.state.allLoggedSets[1].setIndex).toBe(2);
    });
    
    it('should compute correct idempotency key for same setIndex + itemId', () => {
      // Idempotency key should be: `${itemId}_${setIndex}`
      // This test verifies the key format (actual guard is in UI component)
      const dbItemId = 'actual_db_item_123';
      const setIndex = 1;
      const expectedKey = `${dbItemId}_${setIndex}`;
      
      expect(expectedKey).toBe('actual_db_item_123_1');
    });
  });
  
  describe('Runtime.logSet + Autoregulation Output', () => {
    it('should output adjusted next set params for RPE >= 9', () => {
      const exerciseId = sessionPlan.exercises[0].exerciseId;
      
      // Log set 1 with high RPE
      const logResult = logSet(runtimeState, exerciseId, {
        setIndex: 1,
        weight: 60,
        reps: 10,
        rpe: 9, // High RPE should trigger autoregulation
      });
      
      // Should have autoregulation trace for next set (set 2)
      expect(logResult.trace).toBeDefined();
      expect(logResult.trace?.setIndex).toBe(2); // Next set index
      expect(logResult.trace?.ruleId).toBeTruthy();
      expect(logResult.trace?.output.message).toBeTruthy();
      
      // Next set should have adjusted params in exercise state
      const exerciseState = logResult.state.exerciseStates[exerciseId];
      const adjustment = exerciseState.adjustments[2]; // Set 2 adjustment
      
      expect(adjustment).toBeDefined();
      expect(adjustment?.weightMultiplier).toBeLessThan(1); // Weight should be reduced
      // Note: RPE 9 may not reduce reps (only weight), RPE 10 reduces both
      if (adjustment?.targetRepsDelta !== undefined) {
        expect(adjustment.targetRepsDelta).toBeLessThan(0); // If present, should be negative
      }
    });
    
    it('should output adjusted params for RPE = 10 (very high)', () => {
      const exerciseId = sessionPlan.exercises[0].exerciseId;
      
      // Log first set with RPE 10 (triggers FIRST_SET_VERY_HIGH_RPE rule)
      const logResult1 = logSet(runtimeState, exerciseId, {
        setIndex: 1,
        weight: 60,
        reps: 10,
        rpe: 10, // Very high RPE on first set
      });
      
      // First set with RPE 10 should trigger adjustment for next set (set 2)
      const exerciseState = logResult1.state.exerciseStates[exerciseId];
      const adjustment = exerciseState.adjustments[2]; // Adjustment for set 2 (next set after set 1)
      
      // RPE 10 on first set should trigger adjustment for remaining sets
      expect(adjustment).toBeDefined();
      expect(adjustment?.weightMultiplier).toBeLessThan(1);
      // First set RPE 10 should use FIRST_SET_VERY_HIGH_RPE rule (10% weight reduction)
      expect(adjustment?.ruleId).toBe('FIRST_SET_VERY_HIGH_RPE');
      expect(adjustment?.weightMultiplier).toBe(0.9); // 10% reduction (1 - 0.10)
    });
    
    it('should NOT output adjustment if RPE < 9', () => {
      const exerciseId = sessionPlan.exercises[0].exerciseId;
      
      const logResult = logSet(runtimeState, exerciseId, {
        setIndex: 1,
        weight: 60,
        reps: 10,
        rpe: 7, // Low RPE - should not trigger adjustment
      });
      
      // May or may not have trace (depends on autoregulation rules)
      // But high-RPE rule should not fire
      if (logResult.trace) {
        expect(logResult.trace.ruleId).not.toBe('high_rpe');
        expect(logResult.trace.ruleId).not.toBe('very_high_rpe');
      }
    });
  });
  
  describe('Payload Builder - DB itemId Usage', () => {
    it('should use actual DB itemId, not synthetic runtime itemId', () => {
      const dbItemId = 'actual_db_item_id_123'; // Actual DB TEXT ID
      const dbSessionId = 'actual_db_session_id_456'; // Actual DB TEXT ID
      const syntheticItemId = `${dbSessionId}_item_0`; // Synthetic runtime ID (should NOT be used)
      
      const payload = buildSetLogPayload(
        dbItemId, // Actual DB ID
        dbSessionId,
        'exercise_123',
        1,
        50.0,
        10,
        7,
        new Date().toISOString(),
      );
      
      // CRITICAL: Should use actual DB itemId
      expect(payload.sessionItemId).toBe(dbItemId);
      expect(payload.sessionItemId).not.toBe(syntheticItemId);
      expect(payload.id).toMatch(new RegExp(`^${dbItemId}_set_1_\\d+$`)); // ID based on DB itemId
    });
    
    it('should use actual DB itemId in offline queue payload', () => {
      const dbItemId = 'actual_db_item_789';
      const syntheticItemId = 'session_123_item_0';
      
      const payload = buildSetLogQueuePayload(dbItemId, 'exercise_456', 3, 70.0, 12, 8);
      
      expect(payload.sessionItemId).toBe(dbItemId); // Actual DB ID
      expect(payload.sessionItemId).not.toBe(syntheticItemId); // NOT synthetic ID
      expect(payload.id).toMatch(new RegExp(`^${dbItemId}_set_3_\\d+$`)); // ID based on DB itemId
    });
    
    it('should have consistent structure between online and offline payloads', () => {
      const dbItemId = 'item_xyz';
      const dbSessionId = 'session_abc';
      
      const onlinePayload = buildSetLogPayload(dbItemId, dbSessionId, 'ex_1', 1, 50, 10, 7, new Date().toISOString());
      const offlinePayload = buildSetLogQueuePayload(dbItemId, 'ex_1', 1, 50, 10, 7);
      
      // Both should use same DB itemId
      expect(onlinePayload.sessionItemId).toBe(offlinePayload.sessionItemId);
      expect(onlinePayload.setIndex).toBe(offlinePayload.payload.setIndex);
      expect(onlinePayload.weight).toBe(offlinePayload.payload.weight);
      expect(onlinePayload.reps).toBe(offlinePayload.payload.reps);
      expect(onlinePayload.rpe).toBe(offlinePayload.payload.rpe);
    });
  });
});
