/**
 * Pure day→rows mapping for signal ledger backfill (no Expo / API imports).
 */
import { formatLocalDateYYYYMMDD } from '@/lib/training/dateUtils';
import type { SignalLedgerRow } from '@/lib/localData/signalLedgerFlatten';

export type MoodLike = {
  created_at?: string;
  logged_at?: string;
  day_date?: string;
  score?: number;
  mood?: number;
  rating?: number;
};
export type SleepLike = {
  start_time?: string;
  end_time?: string;
  duration_minutes?: number | null;
};
export type TrainingLike = {
  started_at?: string | null;
  ended_at?: string | null;
  summary?: { activeCaloriesKcal?: number } | null;
};

function dayKeyFromIso(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatLocalDateYYYYMMDD(d);
}

function sleepHours(s: SleepLike): number | null {
  if (typeof s.duration_minutes === 'number' && s.duration_minutes > 0) {
    return Math.round((s.duration_minutes / 60) * 10) / 10;
  }
  if (s.start_time && s.end_time) {
    const ms = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
    if (ms > 0) return Math.round((ms / 3_600_000) * 10) / 10;
  }
  return null;
}

/** Map domain rows → dayDate → ledger rows (idempotent upsert payload). */
export function buildHistoricalLedgerByDay(input: {
  moods: MoodLike[];
  sleeps: SleepLike[];
  trainings: TrainingLike[];
}): Map<string, SignalLedgerRow[]> {
  const byDay = new Map<string, SignalLedgerRow[]>();

  const push = (day: string, row: SignalLedgerRow) => {
    const list = byDay.get(day) ?? [];
    list.push(row);
    byDay.set(day, list);
  };

  for (const m of input.moods) {
    const day = m.day_date ?? dayKeyFromIso(m.logged_at ?? m.created_at);
    const score =
      typeof m.score === 'number'
        ? m.score
        : typeof m.mood === 'number'
          ? m.mood
          : typeof m.rating === 'number'
            ? m.rating
            : null;
    if (!day || score == null || !Number.isFinite(score)) continue;
    push(day, { factor: 'mood.last', value: score, source: 'mood_backfill' });
  }

  for (const s of input.sleeps) {
    const day = dayKeyFromIso(s.end_time ?? s.start_time);
    const hours = sleepHours(s);
    if (!day || hours == null) continue;
    push(day, { factor: 'sleep.lastNight.hours', value: hours, source: 'sleep_backfill' });
  }

  const sessionsByDay = new Map<string, TrainingLike[]>();
  for (const t of input.trainings) {
    const day = dayKeyFromIso(t.ended_at ?? t.started_at);
    if (!day) continue;
    const list = sessionsByDay.get(day) ?? [];
    list.push(t);
    sessionsByDay.set(day, list);
  }

  for (const [day, sessions] of sessionsByDay) {
    push(day, {
      factor: 'training.weeklySessionCount',
      value: sessions.length,
      source: 'training_backfill',
    });
    const kcal = sessions.reduce((sum, s) => {
      const v = s.summary?.activeCaloriesKcal;
      return sum + (typeof v === 'number' && v > 0 ? v : 0);
    }, 0);
    if (kcal > 0) {
      push(day, {
        factor: 'training.lastSessionActiveKcal',
        value: kcal,
        source: 'training_backfill',
      });
    }
  }

  return byDay;
}
