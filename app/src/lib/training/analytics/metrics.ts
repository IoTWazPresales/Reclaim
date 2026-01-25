/**
 * Training Analytics - Pure Functions for Metrics Computation
 * 
 * All functions are pure, deterministic, and can be tested without mocks.
 * They compute trends, aggregations, and statistics from training data.
 */

import type {
  TrendPoint,
  E1RMTrend,
  VolumeTrend,
  VolumeByIntent,
  AdherenceStats,
  FatigueIndicator,
  MovementIntent,
  SetLogEntry,
  PersonalRecord,
} from '../types';
import { estimate1RM } from '../progression';
import { getTodayLocalYYYYMMDD } from '../dateUtils';

// ============================================================================
// E1RM TREND COMPUTATION
// ============================================================================

/**
 * Compute e1RM trend for an exercise from set logs
 */
export function computeExerciseE1RMTrend(
  setLogs: Array<{
    exerciseId: string;
    weight: number;
    reps: number;
    completedAt: string;
    sessionId?: string;
  }>,
  exerciseId: string,
  exerciseName: string = exerciseId,
): E1RMTrend {
  const exerciseLogs = setLogs.filter(s => s.exerciseId === exerciseId && s.weight > 0);
  
  if (exerciseLogs.length === 0) {
    return {
      exerciseId,
      exerciseName,
      points: [],
    };
  }
  
  // Group by date (YYYY-MM-DD)
  const byDate: Record<string, typeof exerciseLogs> = {};
  for (const log of exerciseLogs) {
    const date = log.completedAt.split('T')[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(log);
  }
  
  // Compute best e1RM per day
  const points: TrendPoint[] = [];
  let peakE1RM = 0;
  let peakDate: string | undefined;
  
  for (const [date, logs] of Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]))) {
    const e1RMs = logs.map(l => estimate1RM(l.weight, l.reps));
    const bestE1RM = Math.max(...e1RMs);
    
    if (bestE1RM > 0) {
      points.push({
        date,
        value: Math.round(bestE1RM * 10) / 10,
        sessionId: logs[0]?.sessionId,
      });
      
      if (bestE1RM > peakE1RM) {
        peakE1RM = bestE1RM;
        peakDate = date;
      }
    }
  }
  
  const currentE1RM = points.length > 0 ? points[points.length - 1].value : undefined;
  
  return {
    exerciseId,
    exerciseName,
    points,
    currentE1RM,
    peakE1RM: peakE1RM > 0 ? Math.round(peakE1RM * 10) / 10 : undefined,
    peakDate,
  };
}

/**
 * Compute best set trend (heaviest set per session)
 */
export function computeExerciseBestSetTrend(
  setLogs: Array<{
    exerciseId: string;
    weight: number;
    reps: number;
    completedAt: string;
    sessionId?: string;
  }>,
  exerciseId: string,
): TrendPoint[] {
  const exerciseLogs = setLogs.filter(s => s.exerciseId === exerciseId && s.weight > 0);
  
  // Group by date
  const byDate: Record<string, typeof exerciseLogs> = {};
  for (const log of exerciseLogs) {
    const date = log.completedAt.split('T')[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(log);
  }
  
  const points: TrendPoint[] = [];
  
  for (const [date, logs] of Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]))) {
    const bestWeight = Math.max(...logs.map(l => l.weight));
    points.push({
      date,
      value: bestWeight,
      sessionId: logs[0]?.sessionId,
    });
  }
  
  return points;
}

// ============================================================================
// VOLUME COMPUTATION
// ============================================================================

/**
 * Compute volume trend for an exercise (weight × reps per session)
 */
export function computeExerciseVolumeTrend(
  setLogs: Array<{
    exerciseId: string;
    weight: number;
    reps: number;
    completedAt: string;
    sessionId?: string;
  }>,
  exerciseId: string,
): VolumeTrend {
  const exerciseLogs = setLogs.filter(s => s.exerciseId === exerciseId);
  
  // Group by date
  const byDate: Record<string, typeof exerciseLogs> = {};
  for (const log of exerciseLogs) {
    const date = log.completedAt.split('T')[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(log);
  }
  
  const points: TrendPoint[] = [];
  let totalVolume = 0;
  
  for (const [date, logs] of Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]))) {
    const sessionVolume = logs.reduce((sum, l) => sum + (l.weight * l.reps), 0);
    totalVolume += sessionVolume;
    
    points.push({
      date,
      value: Math.round(sessionVolume),
      sessionId: logs[0]?.sessionId,
    });
  }
  
  const averageVolume = points.length > 0 ? totalVolume / points.length : 0;
  
  return {
    exerciseId,
    points,
    totalVolume: Math.round(totalVolume),
    averageVolume: Math.round(averageVolume),
  };
}

/**
 * Compute total session volume trend
 */
export function computeSessionVolumeTrend(
  sessionData: Array<{
    sessionId: string;
    startedAt: string;
    totalVolume: number;
  }>,
): VolumeTrend {
  const points: TrendPoint[] = sessionData
    .map(s => ({
      date: s.startedAt.split('T')[0],
      value: s.totalVolume,
      sessionId: s.sessionId,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const totalVolume = points.reduce((sum, p) => sum + p.value, 0);
  const averageVolume = points.length > 0 ? totalVolume / points.length : 0;
  
  return {
    points,
    totalVolume: Math.round(totalVolume),
    averageVolume: Math.round(averageVolume),
  };
}

/**
 * Compute session volume breakdown by intent
 */
export function computeSessionVolumeByIntent(
  sessionItems: Array<{
    exerciseId: string;
    intents: MovementIntent[];
    performedSets: Array<{ weight: number; reps: number }>;
  }>,
): VolumeByIntent[] {
  const volumeByIntent: Record<MovementIntent, { volume: number; exerciseCount: Set<string> }> = {} as any;
  let totalVolume = 0;
  
  for (const item of sessionItems) {
    const itemVolume = item.performedSets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
    totalVolume += itemVolume;
    
    // Distribute volume across intents (equal split)
    const intentShare = itemVolume / (item.intents.length || 1);
    
    for (const intent of item.intents) {
      if (!volumeByIntent[intent]) {
        volumeByIntent[intent] = { volume: 0, exerciseCount: new Set() };
      }
      volumeByIntent[intent].volume += intentShare;
      volumeByIntent[intent].exerciseCount.add(item.exerciseId);
    }
  }
  
  const result: VolumeByIntent[] = Object.entries(volumeByIntent)
    .map(([intent, data]) => ({
      intent: intent as MovementIntent,
      volume: Math.round(data.volume),
      percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 100) : 0,
      exerciseCount: data.exerciseCount.size,
    }))
    .sort((a, b) => b.volume - a.volume);
  
  return result;
}

// ============================================================================
// ADHERENCE COMPUTATION
// ============================================================================

/**
 * Compute adherence statistics from program days and sessions
 */
export function computeAdherence(
  programDays: Array<{
    date: string;
    isRestDay?: boolean;
  }>,
  completedSessions: Array<{
    startedAt: string;
    programDayId?: string;
  }>,
): AdherenceStats {
  // Only count non-rest days
  const trainingDays = programDays.filter(d => !d.isRestDay);
  // CRITICAL: Use local date formatting to prevent weekday drift in timezones ahead of UTC
  // See dateUtils.ts for rationale
  const today = getTodayLocalYYYYMMDD();
  
  // Past training days only
  const pastTrainingDays = trainingDays.filter(d => d.date <= today);
  
  // Sessions completed
  const completedCount = completedSessions.length;
  
  // Calculate adherence percentage
  const totalProgramDays = pastTrainingDays.length;
  const adherencePercentage = totalProgramDays > 0
    ? Math.round((completedCount / totalProgramDays) * 100)
    : 0;
  
  // Calculate streaks
  const sessionDates = new Set(
    completedSessions.map(s => s.startedAt.split('T')[0]),
  );
  
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;
  
  // Sort days chronologically
  const sortedDays = [...pastTrainingDays].sort((a, b) => a.date.localeCompare(b.date));
  
  for (const day of sortedDays) {
    if (sessionDates.has(day.date)) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  }
  
  // Current streak from most recent
  currentStreak = 0;
  for (let i = sortedDays.length - 1; i >= 0; i--) {
    if (sessionDates.has(sortedDays[i].date)) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  const skippedDays = totalProgramDays - completedCount;
  
  return {
    totalProgramDays,
    completedSessions: completedCount,
    skippedDays: Math.max(0, skippedDays),
    adherencePercentage,
    currentStreak,
    longestStreak,
  };
}

// ============================================================================
// FATIGUE TREND COMPUTATION
// ============================================================================

/**
 * Compute fatigue trend from session summaries
 */
export function computeFatigueTrend(
  sessionSummaries: Array<{
    sessionId: string;
    startedAt: string;
    averageRpe?: number;
    exercisesSkipped?: number;
    totalExercises?: number;
    durationMinutes?: number;
    expectedDurationMinutes?: number;
  }>,
): FatigueIndicator[] {
  const indicators: FatigueIndicator[] = [];
  
  for (const session of sessionSummaries) {
    // Calculate fatigue score (0-1) from various signals
    let fatigueScore = 0;
    const signalCount = 0;
    const indicatorDetails: FatigueIndicator['indicators'] = {};
    
    // RPE signal
    if (session.averageRpe !== undefined) {
      // Normalize: RPE 5 = 0, RPE 10 = 1
      const rpeScore = Math.max(0, (session.averageRpe - 5) / 5);
      fatigueScore += rpeScore * 0.5; // 50% weight
      indicatorDetails.rpeAverage = session.averageRpe;
    }
    
    // Skip rate signal
    if (session.exercisesSkipped !== undefined && session.totalExercises && session.totalExercises > 0) {
      const skipRate = session.exercisesSkipped / session.totalExercises;
      fatigueScore += skipRate * 0.3; // 30% weight
      indicatorDetails.exercisesSkipped = session.exercisesSkipped;
    }
    
    // Duration variance signal
    if (session.durationMinutes !== undefined && session.expectedDurationMinutes !== undefined) {
      const variance = Math.abs(session.durationMinutes - session.expectedDurationMinutes) / session.expectedDurationMinutes;
      fatigueScore += Math.min(1, variance) * 0.2; // 20% weight
      indicatorDetails.sessionDurationVariance = Math.round(variance * 100);
    }
    
    // Clamp to 0-1
    fatigueScore = Math.min(1, Math.max(0, fatigueScore));
    
    indicators.push({
      date: session.startedAt.split('T')[0],
      sessionId: session.sessionId,
      fatigueScore: Math.round(fatigueScore * 100) / 100,
      indicators: indicatorDetails,
    });
  }
  
  return indicators.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Filter trend points to a date range
 */
export function filterTrendByDateRange(
  points: TrendPoint[],
  startDate: string,
  endDate: string,
): TrendPoint[] {
  return points.filter(p => p.date >= startDate && p.date <= endDate);
}

/**
 * Get trend direction from points
 */
export function getTrendDirection(
  points: TrendPoint[],
): 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' {
  if (points.length < 3) {
    return 'insufficient_data';
  }
  
  // Compare first half average to second half average
  const midpoint = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, midpoint);
  const secondHalf = points.slice(midpoint);
  
  const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;
  
  const changePct = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (changePct > 5) return 'increasing';
  if (changePct < -5) return 'decreasing';
  return 'stable';
}

/**
 * Compute personal records from set log history
 */
export function computePersonalRecords(
  setLogs: Array<{
    exerciseId: string;
    exerciseName?: string;
    weight: number;
    reps: number;
    completedAt: string;
  }>,
): Record<string, {
  bestWeight: number;
  bestReps: number;
  bestE1RM: number;
  bestVolume: number;
  weightDate?: string;
  e1rmDate?: string;
}> {
  const records: Record<string, any> = {};
  
  // Group by exercise
  const byExercise: Record<string, typeof setLogs> = {};
  for (const log of setLogs) {
    if (!byExercise[log.exerciseId]) byExercise[log.exerciseId] = [];
    byExercise[log.exerciseId].push(log);
  }
  
  for (const [exerciseId, logs] of Object.entries(byExercise)) {
    let bestWeight = 0;
    let bestReps = 0;
    let bestE1RM = 0;
    let weightDate: string | undefined;
    let e1rmDate: string | undefined;
    
    // Group by session (date) for volume calculation
    const byDate: Record<string, typeof logs> = {};
    
    for (const log of logs) {
      const date = log.completedAt.split('T')[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(log);
      
      // Weight record
      if (log.weight > bestWeight) {
        bestWeight = log.weight;
        weightDate = date;
      }
      
      // Reps record at same or higher weight
      if (log.reps > bestReps && log.weight >= bestWeight * 0.9) {
        bestReps = log.reps;
      }
      
      // e1RM record
      const e1rm = estimate1RM(log.weight, log.reps);
      if (e1rm > bestE1RM) {
        bestE1RM = e1rm;
        e1rmDate = date;
      }
    }
    
    // Best volume in a single session
    let bestVolume = 0;
    for (const sessionLogs of Object.values(byDate)) {
      const sessionVolume = sessionLogs.reduce((sum, l) => sum + (l.weight * l.reps), 0);
      bestVolume = Math.max(bestVolume, sessionVolume);
    }
    
    records[exerciseId] = {
      bestWeight,
      bestReps,
      bestE1RM: Math.round(bestE1RM * 10) / 10,
      bestVolume: Math.round(bestVolume),
      weightDate,
      e1rmDate,
    };
  }
  
  return records;
}

/**
 * Get exercises with most progress
 */
export function getTopProgressingExercises(
  e1rmTrends: E1RMTrend[],
  limit: number = 5,
): Array<{
  exerciseId: string;
  exerciseName: string;
  progressPercentage: number;
  currentE1RM?: number;
}> {
  const withProgress = e1rmTrends
    .filter(t => t.points.length >= 2 && t.currentE1RM !== undefined)
    .map(t => {
      const firstValue = t.points[0].value;
      const lastValue = t.currentE1RM!;
      const progressPct = ((lastValue - firstValue) / firstValue) * 100;
      
      return {
        exerciseId: t.exerciseId,
        exerciseName: t.exerciseName,
        progressPercentage: Math.round(progressPct * 10) / 10,
        currentE1RM: t.currentE1RM,
      };
    })
    .sort((a, b) => b.progressPercentage - a.progressPercentage);
  
  return withProgress.slice(0, limit);
}
