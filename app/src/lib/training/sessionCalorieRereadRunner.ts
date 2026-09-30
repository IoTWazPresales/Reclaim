/**
 * Performs the post-session Health Connect calorie re-read and writes the
 * session summary. The stored grain stays the session window. No per-set split.
 */
import { healthConnectGetActiveEnergyForSessionWindow } from '@/lib/health/healthConnectService';
import { getTrainingSession, updateTrainingSession } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { commitSessionCalorieReread, type SessionCalorieWindow } from '@/lib/training/sessionCalorieReread';

const lastAttemptAt = new Map<string, number>();
const inFlight = new Set<string>();

/** Minimum gap between re-reads of the same session in this process. */
export const SESSION_CALORIE_REREAD_ATTEMPT_GAP_MS = 60_000;

export function resetSessionCalorieRereadAttemptsForTests(): void {
  lastAttemptAt.clear();
  inFlight.clear();
}

export async function persistSessionCalorieSummary(
  sessionId: string,
  endedAt: string,
  summary: Record<string, unknown>,
): Promise<void> {
  await updateTrainingSession(sessionId, { endedAt, summary });
  await queryClient.invalidateQueries({ queryKey: ['training:sessions'] });
  await queryClient.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
  await queryClient.invalidateQueries({ queryKey: ['training:session', sessionId] });
}

export async function rereadSessionCalories(args: {
  sessionId: string;
  window: SessionCalorieWindow;
  nowMs?: number;
}): Promise<void> {
  const nowMs = args.nowMs ?? Date.now();
  if (inFlight.has(args.sessionId)) return;
  const previous = lastAttemptAt.get(args.sessionId) ?? 0;
  if (nowMs - previous < SESSION_CALORIE_REREAD_ATTEMPT_GAP_MS) return;
  inFlight.add(args.sessionId);
  lastAttemptAt.set(args.sessionId, nowMs);
  try {
    const loaded = await getTrainingSession(args.sessionId);
    const summary = loaded.session.summary;
    const current =
      summary && typeof summary === 'object' && !Array.isArray(summary)
        ? (summary as Record<string, unknown>)
        : {};
    if (current.energyRereadPending !== true) return;
    const read = await healthConnectGetActiveEnergyForSessionWindow(args.window.start, args.window.end);
    const committed = commitSessionCalorieReread(
      current,
      read,
      args.window,
      new Date(nowMs).toISOString(),
    );
    if (!committed.save) return;
    await persistSessionCalorieSummary(args.sessionId, args.window.end, committed.summary);
  } finally {
    inFlight.delete(args.sessionId);
  }
}

export async function retryPendingSessionCalorieReads(
  sessions: Array<{
    id: string;
    started_at?: string | null;
    ended_at?: string | null;
    summary?: Record<string, unknown> | null;
  }>,
  nowMs: number = Date.now(),
): Promise<void> {
  for (const session of sessions) {
    const summary = session.summary;
    if (!summary || summary.energyRereadPending !== true) continue;
    if (!session.started_at || !session.ended_at) continue;
    try {
      await rereadSessionCalories({
        sessionId: session.id,
        window: { start: session.started_at, end: session.ended_at },
        nowMs,
      });
    } catch (error) {
      if (__DEV__) console.debug('[sessionCalorieReread] pending re-read failed', error);
    }
  }
}
