import type { MoodCheckin, SleepSession } from '@/lib/api';
import type { InsightContext } from '@/lib/insights/InsightEngine';
import type { InsightContextSourceData } from '@/lib/insights/contextBuilder';
import type { MedContextInput } from '@/lib/medIntelligence';
import { computeMoodSignals, computeSleepSignals } from '@/lib/medDetailSignals';

const STRESS_TAGS = new Set(['stressed', 'overwhelmed', 'anxious', 'stress']);

export type MedDetailInsightSignals = Pick<MedContextInput, 'mood' | 'sleep' | 'flags'>;

/**
 * Map InsightsProvider SSOT (`lastContext` + `lastSource`) into med-detail note inputs.
 * `lastContext` is authoritative for aggregates; `lastSource` supplies raw rows for
 * sparse-data flags and fallbacks when context is not yet ready.
 */
export function buildMedDetailInsightSignals(
  lastContext: InsightContext | undefined,
  lastSource: InsightContextSourceData | undefined,
): MedDetailInsightSignals {
  const moods = (lastSource?.moods ?? []) as MoodCheckin[];
  const sessions = (lastSource?.sleepSessions ?? []) as SleepSession[];

  const moodFallback = computeMoodSignals(moods);
  const sleepFallback = computeSleepSignals(sessions);

  const tags = lastContext?.tags?.length ? lastContext.tags : moodFallback.tags;

  const stressFromTags = tags.some((t) => STRESS_TAGS.has(String(t).toLowerCase()));

  return {
    mood: {
      latest: lastContext?.mood?.last ?? moodFallback.latest,
      trend3dPct: lastContext?.mood?.trend3dPct ?? moodFallback.trend3dPct,
      tags,
    },
    sleep: {
      lastNightHours: lastContext?.sleep?.lastNight?.hours ?? sleepFallback.lastNightHours,
      avg7dHours: lastContext?.sleep?.avg7d?.hours ?? sleepFallback.avg7dHours,
      sparseData: sleepFallback.sparseData,
    },
    flags: {
      stress: lastContext?.flags?.stress ?? stressFromTags,
    },
  };
}
