/**
 * Data Transform Helpers for Training Analytics
 * 
 * Pure functions that transform raw set logs into analytics-ready data structures.
 * All functions are pure, deterministic, and testable.
 */

import type {
  TrendPoint,
  VolumeByIntent,
  FatigueIndicator,
  MovementIntent,
  SetLogEntry,
} from '../types';
import { computeExerciseE1RMTrend, computeExerciseVolumeTrend } from './metrics';
import { getExerciseById } from '../engine';
import { estimate1RM, detectPRs, type PersonalRecord } from '../progression';

/**
 * Build exercise trend series (e1RM + volume) from set logs
 */
export function buildExerciseTrendSeries(
  setLogs: Array<{
    exerciseId: string;
    weight: number;
    reps: number;
    completedAt: string;
    sessionId?: string;
  }>,
  exerciseId: string,
  exerciseName?: string,
): {
  e1rmTrend: TrendPoint[];
  volumeTrend: TrendPoint[];
} {
  const exercise = getExerciseById(exerciseId);
  const name = exerciseName || exercise?.name || exerciseId;
  
  // Compute e1RM trend
  const e1rmResult = computeExerciseE1RMTrend(setLogs, exerciseId, name);
  
  // Compute volume trend
  const volumeResult = computeExerciseVolumeTrend(setLogs, exerciseId);
  
  return {
    e1rmTrend: e1rmResult.points,
    volumeTrend: volumeResult.points,
  };
}

/**
 * Build session summary from set logs and optional session metadata
 */
export function buildSessionSummary(
  setLogs: Array<{
    exerciseId: string;
    weight: number;
    reps: number;
    rpe: number | null;
    completedAt: string;
    sessionId: string;
  }>,
  sessionMeta?: {
    sessionId: string;
    startedAt: string;
    endedAt?: string;
    exercisesSkipped?: number;
  },
): {
  volumeByIntent: VolumeByIntent[];
  prs: PersonalRecord[];
  fatigueIndicator?: FatigueIndicator;
  totalVolume: number;
  exercisesCompleted: number;
} {
  if (setLogs.length === 0) {
    return {
      volumeByIntent: [],
      prs: [],
      totalVolume: 0,
      exercisesCompleted: 0,
    };
  }
  
  const sessionId = sessionMeta?.sessionId || setLogs[0]?.sessionId || '';
  const sessionDate = sessionMeta?.startedAt 
    ? sessionMeta.startedAt.split('T')[0] 
    : setLogs[0]?.completedAt.split('T')[0] || '';
  
  // Group logs by exercise
  const byExercise: Record<string, typeof setLogs> = {};
  for (const log of setLogs) {
    if (!byExercise[log.exerciseId]) {
      byExercise[log.exerciseId] = [];
    }
    byExercise[log.exerciseId].push(log);
  }
  
  // Compute volume by intent
  const intentVolumes: Record<MovementIntent, number> = {} as Record<MovementIntent, number>;
  const intentExerciseCounts: Record<MovementIntent, Set<string>> = {} as Record<MovementIntent, Set<string>>;
  let totalVolume = 0;
  
  for (const [exerciseId, logs] of Object.entries(byExercise)) {
    const exercise = getExerciseById(exerciseId);
    if (!exercise) continue;
    
    const exerciseVolume = logs.reduce((sum, log) => sum + (log.weight * log.reps), 0);
    totalVolume += exerciseVolume;
    
    // Distribute volume across all intents of the exercise
    for (const intent of exercise.intents) {
      if (!intentVolumes[intent]) {
        intentVolumes[intent] = 0;
        intentExerciseCounts[intent] = new Set();
      }
      intentVolumes[intent] += exerciseVolume / exercise.intents.length;
      intentExerciseCounts[intent].add(exerciseId);
    }
  }
  
  const volumeByIntent: VolumeByIntent[] = Object.entries(intentVolumes)
    .map(([intent, volume]) => ({
      intent: intent as MovementIntent,
      volume: Math.round(volume),
      percentage: totalVolume > 0 ? Math.round((volume / totalVolume) * 100) : 0,
      exerciseCount: intentExerciseCounts[intent as MovementIntent]?.size || 0,
    }))
    .sort((a, b) => b.volume - a.volume);
  
  // Detect PRs (simple detection - compare against previous best in this session)
  const prs: PersonalRecord[] = [];
  for (const [exerciseId, logs] of Object.entries(byExercise)) {
    const exercise = getExerciseById(exerciseId);
    if (!exercise) continue;
    
    const performedSets = logs.map(log => ({ weight: log.weight, reps: log.reps }));
    const sessionPRs = detectPRs(exerciseId, exercise.name, performedSets);
    
    // Filter PRs to only include those that occurred in this session
    for (const pr of sessionPRs) {
      if (logs.some(log => {
        if (pr.metric === 'weight') return log.weight >= pr.value;
        if (pr.metric === 'reps') return log.reps >= pr.value;
        if (pr.metric === 'e1rm') {
          const logE1RM = estimate1RM(log.weight, log.reps);
          return logE1RM >= pr.value;
        }
        if (pr.metric === 'volume') {
          const logVolume = log.weight * log.reps;
          return logVolume >= pr.value;
        }
        return false;
      })) {
        prs.push(pr); // PersonalRecord doesn't have date property
      }
    }
  }
  
  // Compute fatigue indicator
  let fatigueIndicator: FatigueIndicator | undefined;
  if (sessionMeta) {
    const rpeValues = setLogs.filter(log => log.rpe !== null && log.rpe !== undefined).map(log => log.rpe!);
    const rpeAverage = rpeValues.length > 0 
      ? rpeValues.reduce((sum, rpe) => sum + rpe, 0) / rpeValues.length 
      : undefined;
    
    // Simple fatigue score: normalize RPE average (0-1 scale)
    const fatigueScore = rpeAverage !== undefined ? Math.min(1, rpeAverage / 10) : 0;
    
    fatigueIndicator = {
      date: sessionDate,
      sessionId: sessionMeta.sessionId,
      fatigueScore,
      indicators: {
        rpeAverage,
        exercisesSkipped: sessionMeta.exercisesSkipped,
      },
    };
  }
  
  return {
    volumeByIntent,
    prs,
    fatigueIndicator,
    totalVolume: Math.round(totalVolume),
    exercisesCompleted: Object.keys(byExercise).length,
  };
}

/**
 * Group set logs by exercise ID
 */
export function groupLogsByExercise(
  setLogs: Array<{
    exerciseId: string;
    weight: number;
    reps: number;
    rpe?: number | null;
    completedAt: string;
    sessionId?: string;
  }>,
): Record<string, Array<{
  exerciseId: string;
  weight: number;
  reps: number;
  rpe?: number | null;
  completedAt: string;
  sessionId?: string;
}>> {
  const grouped: Record<string, typeof setLogs> = {};
  
  for (const log of setLogs) {
    if (!grouped[log.exerciseId]) {
      grouped[log.exerciseId] = [];
    }
    grouped[log.exerciseId].push(log);
  }
  
  return grouped;
}
