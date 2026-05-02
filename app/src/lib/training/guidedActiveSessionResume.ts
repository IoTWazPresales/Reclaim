/**
 * Evaluates whether local guided-session snapshot can safely reopen the active workout.
 * Snapshot is a hint only — Supabase session rows (or cached list) validate lifecycle.
 */

import type { TrainingSessionItemRow, TrainingSessionRow } from '@/lib/api';
import type { GuidedActiveSessionSnapshot } from '@/lib/training/guidedActiveSessionSnapshot';
import { logger } from '@/lib/logger';

/** Older snapshots are cleared — workouts do not stay active longer than this in practice */
export const GUIDED_SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function isGuidedNotificationSession(session: Pick<TrainingSessionRow, 'decision_trace'>): boolean {
  const t = session.decision_trace as Record<string, unknown> | null | undefined;
  if (!t || typeof t !== 'object') return false;
  return t.notificationMode === 'guided' || t.notification_mode === 'guided';
}

export type GuidedResumeEvaluation =
  | {
      outcome: 'resumed';
      sessionId: string;
      prefetched?: { session: TrainingSessionRow; items: TrainingSessionItemRow[] };
    }
  | { outcome: 'cleared_snapshot' }
  | { outcome: 'skipped'; reason: string };

/**
 * Decide whether to reopen `TrainingSessionView` from SQLite snapshot.
 * - Never resumes when another session UI is already active (`hasActiveSession`).
 * - Clears snapshot when it conflicts with list rows or server confirms ended/non-guided.
 */
export async function evaluateGuidedActiveSessionResume(args: {
  loadSnapshot: () => Promise<GuidedActiveSessionSnapshot | null>;
  clearSnapshot: () => Promise<void>;
  maxAgeMs: number;
  nowMs: number;
  hasActiveSession: boolean;
  /** User left session UI via back — skip auto-resume until AppState foreground resets */
  dismissedSessionId: string | null;
  /** Notification deep-link is supplying navigation — do not compete */
  notificationSessionPending: boolean;
  /** Latest row from sessions list with started_at set and ended_at empty */
  inProgressSession: TrainingSessionRow | null | undefined;
  fetchFullSession: (id: string) => Promise<{
    session: TrainingSessionRow;
    items: TrainingSessionItemRow[];
  }>;
  /** Re-check after async work — false means another path opened the session */
  shouldStillResume?: () => boolean;
}): Promise<GuidedResumeEvaluation> {
  const snap = await args.loadSnapshot();
  if (!snap) return { outcome: 'skipped', reason: 'no_snapshot' };

  const age = args.nowMs - Date.parse(snap.updatedAt);
  if (!Number.isFinite(age) || age > args.maxAgeMs || age < -60_000) {
    await args.clearSnapshot();
    return { outcome: 'cleared_snapshot' };
  }

  if (args.hasActiveSession) {
    return { outcome: 'skipped', reason: 'active_session_live' };
  }

  if (args.dismissedSessionId && args.dismissedSessionId === snap.sessionId) {
    return { outcome: 'skipped', reason: 'user_dismissed_resume' };
  }

  if (args.notificationSessionPending) {
    return { outcome: 'skipped', reason: 'notification_route_pending' };
  }

  const inProg = args.inProgressSession ?? null;

  if (inProg) {
    if (inProg.id !== snap.sessionId) {
      await args.clearSnapshot();
      return { outcome: 'cleared_snapshot' };
    }
    if (!isGuidedNotificationSession(inProg)) {
      await args.clearSnapshot();
      return { outcome: 'cleared_snapshot' };
    }
    if (args.shouldStillResume && !args.shouldStillResume()) {
      return { outcome: 'skipped', reason: 'session_became_active' };
    }
    return { outcome: 'resumed', sessionId: snap.sessionId };
  }

  try {
    const full = await args.fetchFullSession(snap.sessionId);
    if (args.shouldStillResume && !args.shouldStillResume()) {
      return { outcome: 'skipped', reason: 'session_became_active' };
    }
    const ended = !!(full.session as { ended_at?: string | null }).ended_at;
    if (ended) {
      await args.clearSnapshot();
      return { outcome: 'cleared_snapshot' };
    }
    if (!isGuidedNotificationSession(full.session)) {
      await args.clearSnapshot();
      return { outcome: 'cleared_snapshot' };
    }
    return { outcome: 'resumed', sessionId: snap.sessionId, prefetched: full };
  } catch (e) {
    logger.debug('[guidedResume] verify fetch failed', (e as Error)?.message);
    return { outcome: 'skipped', reason: 'verify_fetch_failed' };
  }
}
