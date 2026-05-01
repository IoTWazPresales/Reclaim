/**
 * Training slice for InsightContext (isolated for tests and clarity).
 */
import type { TrainingSessionRow } from '@/lib/api';
import type { InsightContext } from './InsightEngine';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TrainingInsightSlice = NonNullable<InsightContext['training']>;

export function readActiveCaloriesKcal(summary: Record<string, any> | null | undefined): number | undefined {
  const v = summary?.activeCaloriesKcal;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined;
}

export function buildTrainingInsightContext(sessions: TrainingSessionRow[]): TrainingInsightSlice {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sorted = [...sessions]
    .filter((s) => !!s.started_at)
    .sort((a, b) => new Date(b.started_at!).getTime() - new Date(a.started_at!).getTime());

  const latest = sorted[0];
  const latestTime = latest?.started_at ? new Date(latest.started_at).getTime() : null;

  const daysSinceLastSession =
    latestTime !== null ? Math.floor((now - latestTime) / MS_PER_DAY) : undefined;

  const weekMs = 7 * MS_PER_DAY;
  const weeklySessionCount = sorted.filter(
    (s) => s.started_at && now - new Date(s.started_at).getTime() < weekMs,
  ).length;

  const completedToday = sorted.some(
    (s) =>
      s.started_at &&
      new Date(s.started_at).getTime() >= todayStart.getTime() &&
      s.ended_at !== null,
  );

  const completed = sorted.filter((s) => s.ended_at != null && s.started_at);
  const byEndedDesc = [...completed].sort(
    (a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime(),
  );
  const lastSessionActiveKcal = byEndedDesc.length ? readActiveCaloriesKcal(byEndedDesc[0].summary) : undefined;
  const lastSessionEnergyKnown = byEndedDesc.length > 0 && lastSessionActiveKcal !== undefined;

  let weeklyActiveKcalSum: number | undefined;
  let weeklyKcalTotal = 0;
  let weeklyKcalAny = false;
  for (const s of completed) {
    const endMs = new Date(s.ended_at!).getTime();
    if (now - endMs >= weekMs || endMs > now) continue;
    const k = readActiveCaloriesKcal(s.summary);
    if (k !== undefined) {
      weeklyKcalTotal += k;
      weeklyKcalAny = true;
    }
  }
  if (weeklyKcalAny) weeklyActiveKcalSum = Math.round(weeklyKcalTotal * 10) / 10;

  return {
    daysSinceLastSession,
    weeklySessionCount,
    completedToday,
    lastSessionEnergyKnown,
    ...(lastSessionActiveKcal !== undefined ? { lastSessionActiveKcal } : {}),
    ...(weeklyActiveKcalSum !== undefined ? { weeklyActiveKcalSum } : {}),
  };
}
