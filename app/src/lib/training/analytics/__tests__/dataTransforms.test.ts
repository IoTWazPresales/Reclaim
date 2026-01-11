/**
 * Tests for data transform helpers
 */

import { describe, it, expect } from 'vitest';
import { buildExerciseTrendSeries, buildSessionSummary, groupLogsByExercise } from '../dataTransforms';

describe('Data Transforms', () => {
  const mockSetLogs = [
    {
      exerciseId: 'barbell_bench_press',
      weight: 60,
      reps: 10,
      rpe: 7,
      completedAt: '2024-01-01T10:00:00Z',
      sessionId: 'session_1',
    },
    {
      exerciseId: 'barbell_bench_press',
      weight: 60,
      reps: 10,
      rpe: 8,
      completedAt: '2024-01-01T10:05:00Z',
      sessionId: 'session_1',
    },
    {
      exerciseId: 'barbell_squat',
      weight: 100,
      reps: 8,
      rpe: 8,
      completedAt: '2024-01-01T10:15:00Z',
      sessionId: 'session_1',
    },
  ];
  
  describe('buildExerciseTrendSeries', () => {
    it('should build e1RM and volume trends for an exercise', () => {
      const result = buildExerciseTrendSeries(mockSetLogs, 'barbell_bench_press');
      
      expect(result.e1rmTrend).toBeDefined();
      expect(result.e1rmTrend.length).toBeGreaterThan(0);
      expect(result.volumeTrend).toBeDefined();
      expect(result.volumeTrend.length).toBeGreaterThan(0);
      
      // Volume should be calculated (60 * 10 + 60 * 10 = 1200)
      const totalVolume = result.volumeTrend.reduce((sum, p) => sum + p.value, 0);
      expect(totalVolume).toBeGreaterThan(0);
    });
    
    it('should return empty trends for exercise with no logs', () => {
      const result = buildExerciseTrendSeries([], 'nonexistent_exercise');
      
      expect(result.e1rmTrend).toEqual([]);
      expect(result.volumeTrend).toEqual([]);
    });
  });
  
  describe('buildSessionSummary', () => {
    it('should compute volume by intent from set logs', () => {
      const result = buildSessionSummary(mockSetLogs, {
        sessionId: 'session_1',
        startedAt: '2024-01-01T10:00:00Z',
      });
      
      expect(result.volumeByIntent).toBeDefined();
      expect(result.volumeByIntent.length).toBeGreaterThan(0);
      expect(result.totalVolume).toBeGreaterThan(0);
      expect(result.exercisesCompleted).toBe(2); // bench press + squat
    });
    
    it('should compute fatigue indicator when session meta provided', () => {
      const result = buildSessionSummary(mockSetLogs, {
        sessionId: 'session_1',
        startedAt: '2024-01-01T10:00:00Z',
        exercisesSkipped: 1,
      });
      
      expect(result.fatigueIndicator).toBeDefined();
      expect(result.fatigueIndicator?.fatigueScore).toBeGreaterThanOrEqual(0);
      expect(result.fatigueIndicator?.fatigueScore).toBeLessThanOrEqual(1);
      expect(result.fatigueIndicator?.indicators.rpeAverage).toBeDefined();
    });
    
    it('should return empty summary for empty logs', () => {
      const result = buildSessionSummary([]);
      
      expect(result.volumeByIntent).toEqual([]);
      expect(result.prs).toEqual([]);
      expect(result.totalVolume).toBe(0);
      expect(result.exercisesCompleted).toBe(0);
    });
  });
  
  describe('groupLogsByExercise', () => {
    it('should group logs by exercise ID', () => {
      const grouped = groupLogsByExercise(mockSetLogs);
      
      expect(grouped['barbell_bench_press']).toBeDefined();
      expect(grouped['barbell_bench_press'].length).toBe(2);
      expect(grouped['barbell_squat']).toBeDefined();
      expect(grouped['barbell_squat'].length).toBe(1);
    });
    
    it('should return empty object for empty logs', () => {
      const grouped = groupLogsByExercise([]);
      expect(grouped).toEqual({});
    });
  });
});
