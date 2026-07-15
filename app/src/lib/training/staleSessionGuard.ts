import { getPerformedSetsFromItem } from '@/lib/training/sessionWorkAuthority';
import type { TrainingSessionItemRow } from '@/lib/api';
import { getStaleSessionThresholdMs } from '@/lib/training/sessionUiConstants';

/**
 * True when session started_at is older than the stale threshold AND no performed set
 * was logged (completedAt) within that same window. Used only for UI resume prompt —
 * does not change sessionWorkAuthority or completion paths.
 */
export function isSessionStaleForResume(
  startedAt: string | null | undefined,
  items: TrainingSessionItemRow[],
  nowMs: number = Date.now(),
  thresholdMs: number = getStaleSessionThresholdMs(),
): boolean {
  if (!startedAt) return false;
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return false;
  if (nowMs - startedMs < thresholdMs) return false;

  let latestCompletedMs = 0;
  for (const item of items) {
    for (const set of getPerformedSetsFromItem(item)) {
      if (!set.completedAt) continue;
      const t = new Date(set.completedAt).getTime();
      if (Number.isFinite(t) && t > latestCompletedMs) latestCompletedMs = t;
    }
  }

  if (latestCompletedMs > 0 && nowMs - latestCompletedMs < thresholdMs) {
    return false;
  }

  return true;
}

/** Frozen wall-clock elapsed at evaluation time (seconds). */
export function freezeElapsedSecondsFromStartedAt(
  startedAt: string | null | undefined,
  nowMs: number = Date.now(),
): number {
  if (!startedAt) return 0;
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return 0;
  return Math.max(0, Math.floor((nowMs - startedMs) / 1000));
}
