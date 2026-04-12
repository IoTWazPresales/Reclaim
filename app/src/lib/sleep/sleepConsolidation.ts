/**
 * Sleep Consolidation & Enrichment
 *
 * Architectural module for:
 * 1. Merging split sessions (e.g. 11pm-7am + 7:20am-7:40am) into one per night
 * 2. Deduplicating same-session data from multiple providers (prefer richest source)
 * 3. Cross-provider enrichment (fill stages/efficiency when one provider has them)
 *
 * Used in sync pipeline before writing to Supabase. Ensures one coherent session
 * per "sleep night" with best-available stages and efficiency.
 */
import type { HealthPlatform, SleepSession, SleepStageSegment } from '@/lib/health/types';
import { logger } from '@/lib/logger';

/** Max gap (minutes) between sessions to treat as same sleep (e.g. bathroom break) */
const MAX_GAP_MINUTES = 120;

/** Max start/end difference (minutes) to treat as same session when deduping */
const DEDUPE_TOLERANCE_MINUTES = 5;

/** Provider priority for choosing best source when deduping (higher = prefer) */
const SOURCE_PRIORITY: Record<HealthPlatform, number> = {
  health_connect: 4,
  apple_healthkit: 3,
  samsung_health: 2,
  google_fit: 1,
  garmin: 1,
  huawei: 1,
  unknown: 0,
};

export type TaggedSleepSession = SleepSession & { _provider?: HealthPlatform };

/** Score for session richness (stages + efficiency) */
function sessionRichness(s: SleepSession): number {
  let score = 0;
  if (s.stages && s.stages.length > 0) score += 10;
  if (typeof s.efficiency === 'number' && Number.isFinite(s.efficiency)) score += 5;
  if (s.metadata?.deepSleepMinutes != null || s.metadata?.remSleepMinutes != null) score += 2;
  return score + (SOURCE_PRIORITY[s.source] ?? 0);
}

/** Canonical sleep-night date (YYYY-MM-DD). Sessions ending before noon are attributed to the previous calendar day (matching UI dedup and HC classifier). */
export function getSleepNightKey(session: SleepSession): string {
  const end = session.endTime instanceof Date ? new Date(session.endTime.getTime()) : new Date(session.endTime);
  if (end.getHours() < 12) {
    end.setDate(end.getDate() - 1);
  }
  const y = end.getFullYear();
  const m = `${end.getMonth() + 1}`.padStart(2, '0');
  const d = `${end.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Sessions overlap or are within tolerance (same logical session from different providers) */
function sameLogicalSession(a: SleepSession, b: SleepSession): boolean {
  const aStart = a.startTime instanceof Date ? a.startTime.getTime() : new Date(a.startTime).getTime();
  const aEnd = a.endTime instanceof Date ? a.endTime.getTime() : new Date(a.endTime).getTime();
  const bStart = b.startTime instanceof Date ? b.startTime.getTime() : new Date(b.startTime).getTime();
  const bEnd = b.endTime instanceof Date ? b.endTime.getTime() : new Date(b.endTime).getTime();
  const tol = DEDUPE_TOLERANCE_MINUTES * 60 * 1000;
  return Math.abs(aStart - bStart) <= tol && Math.abs(aEnd - bEnd) <= tol;
}

/** Gap in ms between end of a and start of b */
function gapMs(a: SleepSession, b: SleepSession): number {
  const aEnd = a.endTime instanceof Date ? a.endTime.getTime() : new Date(a.endTime).getTime();
  const bStart = b.startTime instanceof Date ? b.startTime.getTime() : new Date(b.startTime).getTime();
  return bStart - aEnd;
}

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

function normalizeStages(segments: SleepStageSegment[]): SleepStageSegment[] {
  return segments
    .filter((s) => s?.start && s?.end && s?.stage)
    .map((s) => ({
      start: toDate(s.start),
      end: toDate(s.end),
      stage: s.stage,
    }))
    .filter((s) => s.end.getTime() > s.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Compute efficiency from stages (awake / total) */
function computeEfficiencyFromStages(stages: SleepStageSegment[], totalMinutes: number): number | undefined {
  if (stages.length === 0 || totalMinutes <= 0) return undefined;
  const awakeMinutes = stages
    .filter((s) => s.stage === 'awake')
    .reduce((sum, s) => sum + (s.end.getTime() - s.start.getTime()) / 60000, 0);
  const ratio = (totalMinutes - awakeMinutes) / totalMinutes;
  return Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : undefined;
}

/** Merge stages from multiple sessions (concatenate, sort by start, dedupe overlaps) */
function mergeStages(sessions: SleepSession[]): SleepStageSegment[] {
  const all: SleepStageSegment[] = [];
  for (const s of sessions) {
    if (s.stages?.length) all.push(...s.stages.map((seg) => ({ ...seg, start: toDate(seg.start), end: toDate(seg.end) })));
  }
  if (all.length === 0) return [];
  const sorted = all.sort((a, b) => a.start.getTime() - b.start.getTime());
  return normalizeStages(sorted);
}

/** Pick best source when deduping */
function pickBestSession(sessions: SleepSession[]): SleepSession {
  return sessions.slice().sort((a, b) => sessionRichness(b) - sessionRichness(a))[0]!;
}

/** Merge overlapping/same sessions into one (dedupe) */
function dedupeGroup(sessions: SleepSession[]): SleepSession[] {
  if (sessions.length <= 1) return sessions;
  const result: SleepSession[] = [];
  for (const s of sessions) {
    const same = result.find((r) => sameLogicalSession(r, s));
    if (same) {
      const best = pickBestSession([same, s]);
      const idx = result.indexOf(same);
      result[idx] = best;
    } else {
      result.push(s);
    }
  }
  return result;
}

/** Merge split sessions (adjacent within MAX_GAP_MINUTES) */
function mergeSplitsInGroup(sessions: SleepSession[]): SleepSession[] {
  if (sessions.length <= 1) return sessions;
  const sorted = sessions.slice().sort((a, b) => {
    const aStart = toDate(a.startTime).getTime();
    const bStart = toDate(b.startTime).getTime();
    return aStart - bStart;
  });

  const merged: SleepSession[] = [];
  let current = { ...sorted[0]! };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]!;
    const gap = gapMs(current, next);
    if (gap <= MAX_GAP_MINUTES * 60 * 1000 && gap >= 0) {
      const curEnd = toDate(current.endTime);
      const nextEnd = toDate(next.endTime);
      const nextStart = toDate(next.startTime);
      const newEnd = nextEnd.getTime() > curEnd.getTime() ? nextEnd : curEnd;
      const stages = mergeStages([current, next]);
      const totalMinutes = Math.round((newEnd.getTime() - toDate(current.startTime).getTime()) / 60000);
      const efficiency = computeEfficiencyFromStages(stages, totalMinutes)
        ?? current.efficiency
        ?? next.efficiency;

      current = {
        startTime: current.startTime,
        endTime: newEnd,
        durationMinutes: totalMinutes,
        efficiency,
        stages: stages.length > 0 ? stages : current.stages ?? next.stages,
        source: sessionRichness(current) >= sessionRichness(next) ? current.source : next.source,
        metadata: mergeMetadata(current.metadata, next.metadata),
      };
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
}

function mergeMetadata(a?: SleepSession['metadata'], b?: SleepSession['metadata']): SleepSession['metadata'] {
  if (!a && !b) return undefined;
  const merged = { ...a, ...b };
  if (a?.deepSleepMinutes != null || b?.deepSleepMinutes != null) {
    merged.deepSleepMinutes = (a?.deepSleepMinutes ?? 0) + (b?.deepSleepMinutes ?? 0);
  }
  if (a?.remSleepMinutes != null || b?.remSleepMinutes != null) {
    merged.remSleepMinutes = (a?.remSleepMinutes ?? 0) + (b?.remSleepMinutes ?? 0);
  }
  if (a?.lightSleepMinutes != null || b?.lightSleepMinutes != null) {
    merged.lightSleepMinutes = (a?.lightSleepMinutes ?? 0) + (b?.lightSleepMinutes ?? 0);
  }
  if (a?.awakeMinutes != null || b?.awakeMinutes != null) {
    merged.awakeMinutes = (a?.awakeMinutes ?? 0) + (b?.awakeMinutes ?? 0);
  }
  return merged;
}

/** Enrich session with stages/efficiency from best available in group */
function enrichSession(session: SleepSession, group: SleepSession[]): SleepSession {
  let stages = session.stages;
  let efficiency = session.efficiency;
  let metadata = session.metadata;

  for (const other of group) {
    if (other === session) continue;
    if (!stages?.length && other.stages?.length) stages = other.stages;
    if ((efficiency == null || !Number.isFinite(efficiency)) && other.efficiency != null) efficiency = other.efficiency;
    if (!metadata?.deepSleepMinutes && other.metadata?.deepSleepMinutes != null) {
      metadata = { ...metadata, ...other.metadata };
    }
  }

  if (stages?.length && (efficiency == null || !Number.isFinite(efficiency))) {
    const totalMin = session.durationMinutes ?? 1;
    efficiency = computeEfficiencyFromStages(stages, totalMin) ?? efficiency;
  }

  if (stages === session.stages && efficiency === session.efficiency && metadata === session.metadata) {
    return session;
  }
  return { ...session, stages: stages ?? session.stages, efficiency, metadata: metadata ?? session.metadata };
}

function sessionKey(s: SleepSession): string {
  const start = toDate(s.startTime).toISOString();
  const end = toDate(s.endTime).toISOString();
  return `${start}|${end}`;
}

export type ConsolidationResult = {
  sessions: TaggedSleepSession[];
  /** Keys of raw sessions that were merged into another (for DB cleanup) */
  supersededKeys: string[];
};

/**
 * Consolidate sleep sessions: merge splits and dedupe.
 * Returns one coherent session per sleep night (or per distinct sleep period for naps).
 */
export function consolidateSleepSessions(sessions: TaggedSleepSession[]): ConsolidationResult {
  const supersededKeys: string[] = [];
  if (sessions.length === 0) return { sessions: [], supersededKeys };

  const valid = sessions.filter((s) => {
    if (!s?.startTime || !s?.endTime) return false;
    const start = toDate(s.startTime);
    const end = toDate(s.endTime);
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start;
  });

  const byNight = new Map<string, SleepSession[]>();
  for (const s of valid) {
    const key = getSleepNightKey(s);
    const list = byNight.get(key) ?? [];
    list.push(s);
    byNight.set(key, list);
  }

  const result: TaggedSleepSession[] = [];
  for (const [, group] of byNight) {
    const deduped = dedupeGroup(group);
    const merged = mergeSplitsInGroup(deduped);
    const outputKeys = new Set(merged.map(sessionKey));
    for (const s of group) {
      const k = sessionKey(s);
      if (!outputKeys.has(k)) supersededKeys.push(k);
    }
    for (const session of merged) {
      const enriched = enrichSession(session, group);
      result.push({ ...enriched, _provider: (session as TaggedSleepSession)._provider ?? session.source } as TaggedSleepSession);
    }
  }

  result.sort((a, b) => toDate(b.endTime).getTime() - toDate(a.endTime).getTime());

  if (__DEV__ && (result.length !== sessions.length || supersededKeys.length > 0)) {
    logger.debug('[sleepConsolidation]', {
      inputCount: sessions.length,
      outputCount: result.length,
      supersededCount: supersededKeys.length,
    });
  }

  return { sessions: result, supersededKeys };
}
