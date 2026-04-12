import type { IntegrationId } from '@/lib/health/integrationStore';
import type { SleepSession } from '@/lib/api';

/**
 * Map a session end-time to a canonical "night date" string (YYYY-MM-DD).
 * Sessions ending before noon are attributed to the previous calendar day.
 */
export function sleepNightKey(endTimeISO: string): string {
  const end = new Date(endTimeISO);
  if (isNaN(end.getTime())) return endTimeISO;
  if (end.getHours() < 12) {
    const prev = new Date(end);
    prev.setDate(prev.getDate() - 1);
    return prev.toISOString().slice(0, 10);
  }
  return end.toISOString().slice(0, 10);
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

/**
 * Deduplicate sleep sessions by night. When multiple providers have written a
 * session for the same night, keep one row per night (preferred provider +
 * duration rules), then sort most-recent-first — same as Sleep history.
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
    const byDuration = [...group].sort(
      (a, b) => (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0),
    );
    if (preferredSource) {
      const preferredGroup = byDuration.filter((r) => r.source === preferredSource);
      if (preferredGroup.length > 0) {
        const mainPreferred = preferredGroup.find((r) => r.session_type === 'main');
        if (mainPreferred) {
          result.push(mainPreferred);
          continue;
        }
        result.push(preferredGroup[0]);
        continue;
      }
    }
    const mainInGroup = byDuration.find((r) => r.session_type === 'main');
    if (mainInGroup) {
      result.push(mainInGroup);
      continue;
    }
    result.push(byDuration[0]);
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
