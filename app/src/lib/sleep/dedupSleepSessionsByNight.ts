import type { IntegrationId } from '@/lib/health/integrationStore';
import type { SleepSession } from '@/lib/api';
import { sleepNightKeyFromEnd } from '@/lib/sleep/sleepConsolidation';

/**
 * Map a session end-time to a canonical "night date" string (YYYY-MM-DD).
 * Delegates to the single source of truth in sleepConsolidation.
 */
export function sleepNightKey(endTimeISO: string): string {
  return sleepNightKeyFromEnd(endTimeISO);
}

const INTEGRATION_ID_TO_SOURCE: Partial<Record<IntegrationId, SleepSession['source']>> = {
  health_connect: 'healthconnect',
  apple_healthkit: 'healthkit',
  samsung_health: 'samsung_health',
};

export function preferredIntegrationToDbSource(
  integrationId: IntegrationId | null,
): SleepSession['source'] | null {
  if (!integrationId) return null;
  return INTEGRATION_ID_TO_SOURCE[integrationId] ?? null;
}

/** Does this DB row have meaningful stage data? */
function hasStages(row: SleepSession): boolean {
  if (!row.stages) return false;
  if (typeof row.stages === 'string') {
    try {
      const parsed = JSON.parse(row.stages);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }
  return Array.isArray(row.stages) && row.stages.length > 0;
}

/**
 * Pick the best session from a candidate list. Prefers sessions with
 * stage data when durations are comparable (within 20%), otherwise
 * picks the longest.
 */
function pickBest(candidates: SleepSession[]): SleepSession {
  const sorted = [...candidates].sort((a, b) => {
    const durA = a.duration_minutes ?? 0;
    const durB = b.duration_minutes ?? 0;
    const stagesA = hasStages(a);
    const stagesB = hasStages(b);

    // When durations are within 20% of each other, prefer the one with stages
    const maxDur = Math.max(durA, durB, 1);
    const comparable = Math.abs(durA - durB) / maxDur <= 0.2;
    if (comparable && stagesA !== stagesB) return stagesA ? -1 : 1;

    // Otherwise longest first
    if (durB !== durA) return durB - durA;

    // Final tiebreaker: stages
    if (stagesA !== stagesB) return stagesA ? -1 : 1;
    return 0;
  });
  return sorted[0];
}

/**
 * Deduplicate sleep sessions by night. When multiple providers have written a
 * session for the same night, keep one row per night (preferred provider +
 * duration + richness rules), then sort most-recent-first.
 */
export function dedupSleepSessionsByNight(
  rows: SleepSession[],
  preferredSource: SleepSession['source'] | null,
): SleepSession[] {
  if (rows.length <= 1) return rows;

  const byNight = new Map<string, SleepSession[]>();
  for (const row of rows) {
    const key = sleepNightKey(row.end_time);
    const group = byNight.get(key) ?? [];
    group.push(row);
    byNight.set(key, group);
  }

  const result: SleepSession[] = [];
  for (const [, group] of byNight) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    if (preferredSource) {
      const preferredGroup = group.filter((r) => r.source === preferredSource);
      if (preferredGroup.length > 0) {
        const mainPreferred = preferredGroup.find((r) => r.session_type === 'main');
        result.push(mainPreferred ?? pickBest(preferredGroup));
        continue;
      }
    }
    const mainInGroup = group.find((r) => r.session_type === 'main');
    if (mainInGroup) {
      result.push(mainInGroup);
      continue;
    }
    result.push(pickBest(group));
  }

  return result.sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );
}

/** Latest canonical night row after merge (matches Sleep screen history head). */
export function pickLatestDedupedSleepRow(
  rows: SleepSession[],
  preferredSource: SleepSession['source'] | null,
): SleepSession | null {
  const deduped = dedupSleepSessionsByNight(rows, preferredSource);
  return deduped[0] ?? null;
}
