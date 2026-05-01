/**
 * Analytics Metrics Tests
 * 
 * Tests for pure analytics functions:
 * - e1RM trend computation
 * - Volume aggregation
 * - Adherence calculation
 * - Fatigue trend detection
 */

import { describe, it, expect } from 'vitest';
import {
  computeExerciseE1RMTrend,
  computeExerciseBestSetTrend,
  computeExerciseVolumeTrend,
  computeSessionVolumeTrend,
  computeSessionVolumeByIntent,
  computeAdherence,
  computeFatigueTrend,
  filterTrendByDateRange,
  getTrendDirection,
  computePersonalRecords,
  getTopProgressingExercises,
} from '../metrics';

describe('E1RM Trend Computation', () => {
  it('should compute e1RM trend from set logs', () => {
    const setLogs = [
      { exerciseId: 'bench_press', weight: 100, reps: 5, completedAt: '2025-01-01T10:00:00Z' },
      { exerciseId: 'bench_press', weight: 100, reps: 6, completedAt: '2025-01-01T10:05:00Z' },
      { exerciseId: 'bench_press', weight: 105, reps: 5, completedAt: '2025-01-08T10:00:00Z' },
    ];
    
    const trend = computeExerciseE1RMTrend(setLogs, 'bench_press', 'Bench Press');
    
    expect(trend.exerciseId).toBe('bench_press');
    expect(trend.exerciseName).toBe('Bench Press');
    expect(trend.points).toHaveLength(2); // Two different dates
    expect(trend.points[0].date).toBe('2025-01-01');
    expect(trend.points[1].date).toBe('2025-01-08');
    expect(trend.peakE1RM).toBeDefined();
    expect(trend.currentE1RM).toBeDefined();
  });
  
  it('should return best e1RM per day', () => {
    const setLogs = [
      { exerciseId: 'bench_press', weight: 100, reps: 5, completedAt: '2025-01-01T10:00:00Z' },
      { exerciseId: 'bench_press', weight: 100, reps: 8, completedAt: '2025-01-01T10:05:00Z' }, // Higher e1RM
    ];
    
    const trend = computeExerciseE1RMTrend(setLogs, 'bench_press');
    
    // Should pick the higher e1RM (8 reps at 100kg)
    // e1RM = 100 * (1 + 8/30) ≈ 126.7
    expect(trend.points[0].value).toBeGreaterThan(120);
  });
  
  it('should handle empty logs', () => {
    const trend = computeExerciseE1RMTrend([], 'bench_press');
    
    expect(trend.points).toHaveLength(0);
    expect(trend.currentE1RM).toBeUndefined();
    expect(trend.peakE1RM).toBeUndefined();
  });
  
  it('should filter by exercise ID', () => {
    const setLogs = [
      { exerciseId: 'bench_press', weight: 100, reps: 5, completedAt: '2025-01-01T10:00:00Z' },
      { exerciseId: 'squat', weight: 150, reps: 5, completedAt: '2025-01-01T10:00:00Z' },
    ];
    
    const trend = computeExerciseE1RMTrend(setLogs, 'bench_press');
    
    expect(trend.points).toHaveLength(1);
  });
});

describe('Volume Trend Computation', () => {
  it('should compute volume per session', () => {
    const setLogs = [
      { exerciseId: 'bench_press', weight: 100, reps: 8, completedAt: '2025-01-01T10:00:00Z' },
      { exerciseId: 'bench_press', weight: 100, reps: 8, completedAt: '2025-01-01T10:05:00Z' },
      { exerciseId: 'bench_press', weight: 100, reps: 6, completedAt: '2025-01-01T10:10:00Z' },
    ];
    
    const trend = computeExerciseVolumeTrend(setLogs, 'bench_press');
    
    expect(trend.points).toHaveLength(1);
    // Volume = 100*8 + 100*8 + 100*6 = 2200
    expect(trend.points[0].value).toBe(2200);
    expect(trend.totalVolume).toBe(2200);
    expect(trend.averageVolume).toBe(2200);
  });
  
  it('should compute session volume trend', () => {
    const sessionData = [
      { sessionId: 's1', startedAt: '2025-01-01T10:00:00Z', totalVolume: 5000 },
      { sessionId: 's2', startedAt: '2025-01-03T10:00:00Z', totalVolume: 5500 },
      { sessionId: 's3', startedAt: '2025-01-05T10:00:00Z', totalVolume: 6000 },
    ];
    
    const trend = computeSessionVolumeTrend(sessionData);
    
    expect(trend.points).toHaveLength(3);
    expect(trend.totalVolume).toBe(16500);
    expect(trend.averageVolume).toBe(5500);
  });
});

describe('Volume By Intent', () => {
  it('should compute volume breakdown by intent', () => {
    const sessionItems = [
      {
        exerciseId: 'bench_press',
        intents: ['horizontal_press'] as any[],
        performedSets: [
          { weight: 100, reps: 8 },
          { weight: 100, reps: 8 },
        ],
      },
      {
        exerciseId: 'squat',
        intents: ['knee_dominant'] as any[],
        performedSets: [
          { weight: 150, reps: 5 },
          { weight: 150, reps: 5 },
        ],
      },
    ];
    
    const breakdown = computeSessionVolumeByIntent(sessionItems);
    
    expect(breakdown).toHaveLength(2);
    
    const pressVolume = breakdown.find(b => b.intent === 'horizontal_press');
    const squatVolume = breakdown.find(b => b.intent === 'knee_dominant');
    
    expect(pressVolume?.volume).toBe(1600); // 100*8*2
    expect(squatVolume?.volume).toBe(1500); // 150*5*2
    expect(pressVolume!.percentage + squatVolume!.percentage).toBe(100);
  });
  
  it('should split volume across multiple intents', () => {
    const sessionItems = [
      {
        exerciseId: 'deadlift',
        intents: ['hip_hinge', 'knee_dominant'] as any[], // Has two intents
        performedSets: [{ weight: 200, reps: 5 }],
      },
    ];
    
    const breakdown = computeSessionVolumeByIntent(sessionItems);
    
    expect(breakdown).toHaveLength(2);
    // Volume should be split evenly
    expect(breakdown[0].volume).toBe(500); // 1000 / 2
    expect(breakdown[1].volume).toBe(500);
  });
});

describe('Adherence Computation', () => {
  it('should compute adherence percentage', () => {
    const programDays = [
      { date: '2025-01-01' },
      { date: '2025-01-03' },
      { date: '2025-01-05' },
      { date: '2025-01-07' },
    ];
    
    const completedSessions = [
      { startedAt: '2025-01-01T10:00:00Z' },
      { startedAt: '2025-01-03T10:00:00Z' },
      // Missed 01-05 and 01-07
    ];
    
    // Mock "today" as 2025-01-08
    const stats = computeAdherence(programDays, completedSessions);
    
    expect(stats.totalProgramDays).toBe(4);
    expect(stats.completedSessions).toBe(2);
    expect(stats.skippedDays).toBe(2);
    expect(stats.adherencePercentage).toBe(50);
  });
  
  it('should exclude rest days from adherence', () => {
    const programDays = [
      { date: '2025-01-01', isRestDay: false },
      { date: '2025-01-02', isRestDay: true }, // Rest day
      { date: '2025-01-03', isRestDay: false },
    ];
    
    const completedSessions = [
      { startedAt: '2025-01-01T10:00:00Z' },
      { startedAt: '2025-01-03T10:00:00Z' },
    ];
    
    const stats = computeAdherence(programDays, completedSessions);
    
    expect(stats.totalProgramDays).toBe(2); // Excludes rest day
    expect(stats.adherencePercentage).toBe(100);
  });
  
  it('should calculate current streak', () => {
    const programDays = [
      { date: '2025-01-01' },
      { date: '2025-01-02' },
      { date: '2025-01-03' },
    ];
    
    const completedSessions = [
      { startedAt: '2025-01-02T10:00:00Z' },
      { startedAt: '2025-01-03T10:00:00Z' },
    ];
    
    const stats = computeAdherence(programDays, completedSessions);
    
    expect(stats.currentStreak).toBe(2);
    expect(stats.longestStreak).toBe(2);
  });
});

describe('Fatigue Trend', () => {
  it('should compute fatigue indicators from session data', () => {
    const sessionSummaries = [
      {
        sessionId: 's1',
        startedAt: '2025-01-01T10:00:00Z',
        averageRpe: 6,
        exercisesSkipped: 0,
        totalExercises: 5,
      },
      {
        sessionId: 's2',
        startedAt: '2025-01-03T10:00:00Z',
        averageRpe: 8,
        exercisesSkipped: 1,
        totalExercises: 5,
      },
      {
        sessionId: 's3',
        startedAt: '2025-01-05T10:00:00Z',
        averageRpe: 9,
        exercisesSkipped: 2,
        totalExercises: 5,
      },
    ];
    
    const trend = computeFatigueTrend(sessionSummaries);
    
    expect(trend).toHaveLength(3);
    // Fatigue should increase over sessions
    expect(trend[0].fatigueScore).toBeLessThan(trend[2].fatigueScore);
  });
  
  it('should normalize fatigue score to 0-1', () => {
    const sessionSummaries = [
      {
        sessionId: 's1',
        startedAt: '2025-01-01T10:00:00Z',
        averageRpe: 10, // Max RPE
        exercisesSkipped: 3,
        totalExercises: 5,
      },
    ];
    
    const trend = computeFatigueTrend(sessionSummaries);
    
    expect(trend[0].fatigueScore).toBeLessThanOrEqual(1);
    expect(trend[0].fatigueScore).toBeGreaterThanOrEqual(0);
  });
});

describe('Trend Utilities', () => {
  it('should filter trend by date range', () => {
    const points = [
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-05', value: 105 },
      { date: '2025-01-10', value: 110 },
      { date: '2025-01-15', value: 115 },
    ];
    
    const filtered = filterTrendByDateRange(points, '2025-01-05', '2025-01-10');
    
    expect(filtered).toHaveLength(2);
    expect(filtered[0].date).toBe('2025-01-05');
    expect(filtered[1].date).toBe('2025-01-10');
  });
  
  it('should detect increasing trend', () => {
    const points = [
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-02', value: 102 },
      { date: '2025-01-03', value: 105 },
      { date: '2025-01-04', value: 110 },
      { date: '2025-01-05', value: 115 },
    ];
    
    const direction = getTrendDirection(points);
    
    expect(direction).toBe('increasing');
  });
  
  it('should detect decreasing trend', () => {
    const points = [
      { date: '2025-01-01', value: 115 },
      { date: '2025-01-02', value: 110 },
      { date: '2025-01-03', value: 105 },
      { date: '2025-01-04', value: 100 },
      { date: '2025-01-05', value: 95 },
    ];
    
    const direction = getTrendDirection(points);
    
    expect(direction).toBe('decreasing');
  });
  
  it('should detect stable trend', () => {
    const points = [
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-02', value: 101 },
      { date: '2025-01-03', value: 99 },
      { date: '2025-01-04', value: 100 },
      { date: '2025-01-05', value: 101 },
    ];
    
    const direction = getTrendDirection(points);
    
    expect(direction).toBe('stable');
  });
  
  it('should return insufficient_data for few points', () => {
    const points = [
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-02', value: 105 },
    ];
    
    const direction = getTrendDirection(points);
    
    expect(direction).toBe('insufficient_data');
  });
});

describe('Personal Records Computation', () => {
  it('should compute PRs from set logs', () => {
    const setLogs = [
      { exerciseId: 'bench_press', weight: 100, reps: 5, completedAt: '2025-01-01T10:00:00Z' },
      { exerciseId: 'bench_press', weight: 105, reps: 5, completedAt: '2025-01-08T10:00:00Z' },
      { exerciseId: 'bench_press', weight: 100, reps: 8, completedAt: '2025-01-15T10:00:00Z' }, // Higher e1RM
    ];
    
    const records = computePersonalRecords(setLogs);
    
    expect(records['bench_press']).toBeDefined();
    expect(records['bench_press'].bestWeight).toBe(105);
    expect(records['bench_press'].bestE1RM).toBeGreaterThan(120);
  });
  
  it('should track PRs per exercise', () => {
    const setLogs = [
      { exerciseId: 'bench_press', weight: 100, reps: 5, completedAt: '2025-01-01T10:00:00Z' },
      { exerciseId: 'squat', weight: 150, reps: 5, completedAt: '2025-01-01T10:00:00Z' },
    ];
    
    const records = computePersonalRecords(setLogs);
    
    expect(Object.keys(records)).toHaveLength(2);
    expect(records['bench_press'].bestWeight).toBe(100);
    expect(records['squat'].bestWeight).toBe(150);
  });
});

describe('Top Progressing Exercises', () => {
  it('should return exercises sorted by progress', () => {
    const e1rmTrends = [
      {
        exerciseId: 'bench_press',
        exerciseName: 'Bench Press',
        points: [
          { date: '2025-01-01', value: 100 },
          { date: '2025-01-15', value: 110 },
        ],
        currentE1RM: 110,
      },
      {
        exerciseId: 'squat',
        exerciseName: 'Squat',
        points: [
          { date: '2025-01-01', value: 150 },
          { date: '2025-01-15', value: 180 },
        ],
        currentE1RM: 180, // 20% increase
      },
    ];
    
    const top = getTopProgressingExercises(e1rmTrends as any, 5);
    
    expect(top[0].exerciseId).toBe('squat'); // Highest progress first
    expect(top[0].progressPercentage).toBe(20);
    expect(top[1].exerciseId).toBe('bench_press');
    expect(top[1].progressPercentage).toBe(10);
  });
  
  it('should limit results', () => {
    const e1rmTrends = Array.from({ length: 10 }, (_, i) => ({
      exerciseId: `exercise_${i}`,
      exerciseName: `Exercise ${i}`,
      points: [
        { date: '2025-01-01', value: 100 },
        { date: '2025-01-15', value: 100 + i * 5 },
      ],
      currentE1RM: 100 + i * 5,
    }));
    
    const top = getTopProgressingExercises(e1rmTrends as any, 3);
    
    expect(top).toHaveLength(3);
  });
});

describe('E1RM Computation Stability', () => {
  it('should produce consistent e1RM values', () => {
    // Same input should always produce same output
    const setLogs = [
      { exerciseId: 'bench_press', weight: 100, reps: 5, completedAt: '2025-01-01T10:00:00Z' },
    ];
    
    const trend1 = computeExerciseE1RMTrend(setLogs, 'bench_press');
    const trend2 = computeExerciseE1RMTrend(setLogs, 'bench_press');
    
    expect(trend1.points[0].value).toBe(trend2.points[0].value);
    expect(trend1.currentE1RM).toBe(trend2.currentE1RM);
  });
  
  it('should handle decimal weights correctly', () => {
    const setLogs = [
      { exerciseId: 'bench_press', weight: 102.5, reps: 5, completedAt: '2025-01-01T10:00:00Z' },
    ];
    
    const trend = computeExerciseE1RMTrend(setLogs, 'bench_press');
    
    // Should be a valid number with reasonable precision
    expect(trend.points[0].value).toBeGreaterThan(0);
    // E1RM = 102.5 * (1 + 5/30) ≈ 119.6
    expect(trend.points[0].value).toBeCloseTo(119.6, 0);
  });
});

describe('Volume Aggregation Correctness', () => {
  it('should sum volume correctly', () => {
    const setLogs = [
      { exerciseId: 'bench_press', weight: 100, reps: 10, completedAt: '2025-01-01T10:00:00Z' },
      { exerciseId: 'bench_press', weight: 100, reps: 10, completedAt: '2025-01-01T10:05:00Z' },
      { exerciseId: 'bench_press', weight: 100, reps: 10, completedAt: '2025-01-01T10:10:00Z' },
    ];
    
    const trend = computeExerciseVolumeTrend(setLogs, 'bench_press');
    
    // Volume = 100 * 10 * 3 = 3000
    expect(trend.totalVolume).toBe(3000);
  });
  
  it('should handle zero weight (bodyweight exercises)', () => {
    const setLogs = [
      { exerciseId: 'pull_ups', weight: 0, reps: 10, completedAt: '2025-01-01T10:00:00Z' },
      { exerciseId: 'pull_ups', weight: 0, reps: 8, completedAt: '2025-01-01T10:05:00Z' },
    ];
    
    const trend = computeExerciseVolumeTrend(setLogs, 'pull_ups');
    
    expect(trend.totalVolume).toBe(0); // 0 weight = 0 volume
  });
});

describe('Trend Output Sorting', () => {
  it('should return points sorted by date ascending', () => {
    const setLogs = [
      { exerciseId: 'bench_press', weight: 100, reps: 5, completedAt: '2025-01-15T10:00:00Z' },
      { exerciseId: 'bench_press', weight: 95, reps: 5, completedAt: '2025-01-01T10:00:00Z' },
      { exerciseId: 'bench_press', weight: 97, reps: 5, completedAt: '2025-01-08T10:00:00Z' },
    ];
    
    const trend = computeExerciseE1RMTrend(setLogs, 'bench_press');
    
    expect(trend.points[0].date).toBe('2025-01-01');
    expect(trend.points[1].date).toBe('2025-01-08');
    expect(trend.points[2].date).toBe('2025-01-15');
  });
});
