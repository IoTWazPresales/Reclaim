import { completedPerformanceHistory, type PerformanceHistoryItem } from '../../performanceHistory';
import type { SetLog } from '../../types';

export function historyItem(exerciseId = 'barbell_bench_press', date = '2026-10-01', reps = 8, weight = 60): PerformanceHistoryItem {
  return {
    id: `${exerciseId}-${date}`, session_id: `session-${date}`, exercise_id: exerciseId, skipped: false,
    planned: { sets: [1, 2, 3].map(setIndex => ({ setIndex })) },
    performed: { sets: [1, 2, 3].map(setIndex => ({ setIndex, weight, reps, rpe: 7, completedAt: `${date}T10:30:00Z` })) },
    training_sessions: { started_at: `${date}T10:00:00Z`, ended_at: `${date}T11:00:00Z` },
  };
}

export function canonicalPerformance(exerciseId: string, sets: SetLog[], date: string) {
  const item = historyItem(exerciseId, date.slice(0, 10));
  item.planned = { sets: sets.map(set => ({ setIndex: set.setIndex })) };
  item.performed = { sets };
  item.training_sessions = { started_at: `${date.slice(0, 10)}T00:00:00Z`, ended_at: `${date.slice(0, 10)}T23:59:59Z` };
  return completedPerformanceHistory([item], 3)[exerciseId][0];
}
