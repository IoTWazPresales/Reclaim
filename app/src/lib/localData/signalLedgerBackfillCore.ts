/**
 * Pure day→rows mapping for signal ledger backfill (no Expo / API imports).
 */
import { formatLocalDateYYYYMMDD } from '@/lib/training/dateUtils';
import type { SignalLedgerRow } from '@/lib/localData/signalLedgerFlatten';
import {
  computeAdherenceFromSchedule,
  type MedDoseLogForAdherence,
  type MedSchedule,
} from '@/lib/medicationSchedulePolicy';

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

export type MedLike = {
  id?: string;
  schedule?: MedSchedule;
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

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function addDaysYmd(day: string, delta: number): string {
  const dt = parseDay(day);
  dt.setDate(dt.getDate() + delta);
  return formatLocalDateYYYYMMDD(dt);
}

/** Map domain rows → dayDate → ledger rows (idempotent upsert payload). */
export function buildHistoricalLedgerByDay(input: {
  moods: MoodLike[];
  sleeps: SleepLike[];
  trainings: TrainingLike[];
  meds?: MedLike[];
  medLogs?: MedDoseLogForAdherence[];
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

  const trainingDays = [...sessionsByDay.keys()].sort();
  for (const day of trainingDays) {
    const sessions = sessionsByDay.get(day) ?? [];
    // Honest daily count — chart "Training" series uses this.
    push(day, {
      factor: 'training.sessionsThatDay',
      value: sessions.length,
      source: 'training_backfill',
    });
    // Rolling 7-day session count ending on this day (insights weekly factor).
    let weekly = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDaysYmd(day, -i);
      weekly += sessionsByDay.get(d)?.length ?? 0;
    }
    push(day, {
      factor: 'training.weeklySessionCount',
      value: weekly,
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

  const meds = input.meds ?? [];
  const medLogs = input.medLogs ?? [];
  if (meds.length > 0 && medLogs.length > 0) {
    const daySet = new Set<string>(byDay.keys());
    for (const log of medLogs) {
      const day = dayKeyFromIso(log.taken_at ?? log.scheduled_for ?? log.created_at);
      if (day) daySet.add(day);
    }
    for (const day of [...daySet].sort()) {
      const asOf = parseDay(day);
      asOf.setHours(12, 0, 0, 0);
      const { pct, scheduled } = computeAdherenceFromSchedule(medLogs, meds, 7, asOf);
      if (scheduled <= 0) continue;
      push(day, {
        factor: 'meds.adherencePct7d',
        value: pct,
        source: 'meds_backfill',
      });
    }
  }

  return byDay;
}
