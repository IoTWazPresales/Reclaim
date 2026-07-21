/**
 * Pure helpers for Home signal convergence chart (no React / Expo).
 */
import type { SignalLedgerPoint } from '@/lib/localData/signalLedgerRepository';

export type ChartSeriesDef = {
  key: string;
  label: string;
  /** Normalize raw value into 0..1 for shared axis. */
  max: number;
  /** Short unit for day scrub readout. */
  format: (v: number) => string;
};

export const SIGNAL_CHART_SERIES: ChartSeriesDef[] = [
  {
    key: 'mood.last',
    label: 'Mood',
    max: 5,
    format: (v) => `${Math.round(v * 10) / 10}/5`,
  },
  {
    key: 'sleep.lastNight.hours',
    label: 'Sleep',
    max: 10,
    format: (v) => `${Math.round(v * 10) / 10}h`,
  },
  {
    key: 'training.sessionsThatDay',
    label: 'Training',
    max: 3,
    format: (v) => (v === 1 ? '1 session' : `${Math.round(v)} sessions`),
  },
  {
    key: 'meds.adherencePct7d',
    label: 'Meds',
    max: 100,
    format: (v) => `${Math.round(v)}%`,
  },
];

export function normalizeSignal(value: number, max: number): number {
  if (!Number.isFinite(value) || max <= 0) return 0;
  return Math.max(0, Math.min(1, value / max));
}

/** Union of day dates across series, ascending. */
export function collectChartDays(
  data: Record<string, SignalLedgerPoint[]>,
  keys: string[],
): string[] {
  const set = new Set<string>();
  for (const key of keys) {
    for (const p of data[key] ?? []) {
      if (p.dayDate) set.add(p.dayDate);
    }
  }
  return [...set].sort();
}

export type AlignedPoint = {
  dayDate: string;
  /** 0..1 along x */
  x: number;
  /** normalized 0..1, null if missing that day */
  y: number | null;
  value: number | null;
};

export function alignSeriesToDays(
  points: SignalLedgerPoint[],
  days: string[],
  max: number,
): AlignedPoint[] {
  const byDay = new Map(points.map((p) => [p.dayDate, p.value]));
  const n = Math.max(1, days.length - 1);
  return days.map((dayDate, i) => {
    const raw = byDay.get(dayDate);
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
    return {
      dayDate,
      x: days.length === 1 ? 0.5 : i / n,
      y: value == null ? null : normalizeSignal(value, max),
      value,
    };
  });
}

/** Polyline segments that skip null gaps (no invented interpolation). */
export function buildSegmentedPath(
  points: AlignedPoint[],
  width: number,
  height: number,
): string[] {
  const segments: string[] = [];
  let d = '';
  let started = false;
  for (const p of points) {
    if (p.y == null) {
      if (started) {
        segments.push(d);
        d = '';
        started = false;
      }
      continue;
    }
    const x = p.x * width;
    const y = height - p.y * height;
    if (!started) {
      d = `M ${x} ${y}`;
      started = true;
    } else {
      d += ` L ${x} ${y}`;
    }
  }
  if (started && d) segments.push(d);
  return segments;
}

export function buildConvergenceAnalysis(
  data: Record<string, SignalLedgerPoint[]>,
  days: string[],
): string {
  if (days.length === 0) {
    return 'Nothing invented — log mood, sleep, training, or meds and this chart fills in.';
  }

  const present = SIGNAL_CHART_SERIES.filter((s) => (data[s.key]?.length ?? 0) > 0);
  if (present.length === 0) {
    return 'Nothing invented — log mood, sleep, training, or meds and this chart fills in.';
  }
  if (present.length === 1) {
    return `Only ${present[0]!.label.toLowerCase()} history so far — add another signal to see convergence.`;
  }

  const multiDays = days.filter((day) => {
    let n = 0;
    for (const s of SIGNAL_CHART_SERIES) {
      if ((data[s.key] ?? []).some((p) => p.dayDate === day)) n += 1;
    }
    return n >= 2;
  });

  if (multiDays.length < 3) {
    return `${present.map((s) => s.label).join(' · ')} are on the ledger — keep logging so days overlap and patterns show.`;
  }

  const mood = data['mood.last'] ?? [];
  const sleep = data['sleep.lastNight.hours'] ?? [];
  const train = data['training.sessionsThatDay'] ?? [];
  const meds = data['meds.adherencePct7d'] ?? [];

  const parts: string[] = [];
  if (mood.length && sleep.length) {
    parts.push('Mood and sleep share overlapping days');
  }
  if (train.some((p) => p.value > 0)) {
    const sessions = train.reduce((s, p) => s + (p.value > 0 ? p.value : 0), 0);
    parts.push(`${Math.round(sessions)} training day${sessions === 1 ? '' : 's'} in view`);
  }
  if (meds.length) {
    const last = meds[meds.length - 1]!;
    parts.push(`med adherence recently ~${Math.round(last.value)}%`);
  }

  if (parts.length === 0) {
    return `${multiDays.length} overlapping days across ${present.length} signals — tap a day for figures.`;
  }
  return `${parts.join(' · ')}. Tap a day for exact figures.`;
}

export function formatChartDayLabel(dayDate: string): string {
  const [y, m, d] = dayDate.split('-').map(Number);
  if (!y || !m || !d) return dayDate;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
