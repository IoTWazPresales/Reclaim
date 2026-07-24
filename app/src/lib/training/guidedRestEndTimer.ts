/**
 * FGS-alive rest-end timer — primary delivery for "Rest complete" while a
 * guided session Foreground Service keeps the JS process eligible.
 *
 * OS `training_at` date alarms remain best-effort (exact-alarm grant dependent).
 * This timer arms alongside `scheduleTrainingTimedPrompt` and, at fire time,
 * flips the same intent to `deliverNow` + reconcile so the timed OS id presents
 * via setIntent+reconcile (not a second scheduling authority).
 *
 * Dedup: `firedAt` on the intent (OS receive or this path) makes the other a no-op.
 */
import { logger } from '@/lib/logger';

type ArmedRestEnd = {
  fireAtMs: number;
  handle: ReturnType<typeof setTimeout> | null;
  firing: boolean;
};

const armedBySession = new Map<string, ArmedRestEnd>();

/** Delay until fire; 0 means due now (or overdue). */
export function delayMsUntilRestEnd(fireAtMs: number, nowMs: number = Date.now()): number {
  if (!Number.isFinite(fireAtMs)) return 0;
  return Math.max(0, fireAtMs - nowMs);
}

/** Pure guard used by tests and fire path. */
export function shouldPresentGuidedRestEnd(input: {
  intentExists: boolean;
  firedAt?: string | null;
  expectedFireAtMs: number;
  intentScheduledAtMs?: number | null;
  sessionEnded?: boolean;
}): boolean {
  if (!input.intentExists) return false;
  if (input.firedAt) return false;
  if (input.sessionEnded) return false;
  if (
    input.intentScheduledAtMs != null &&
    Number.isFinite(input.intentScheduledAtMs) &&
    Math.abs(input.intentScheduledAtMs - input.expectedFireAtMs) > 2_000
  ) {
    // Stale timer vs a newer rest-end intent — ignore.
    return false;
  }
  return true;
}

function clearHandle(entry: ArmedRestEnd): void {
  if (entry.handle != null) {
    clearTimeout(entry.handle);
    entry.handle = null;
  }
}

/**
 * Arm (or replace) the in-process rest-end timer for a session.
 * Safe to call when FGS is not running — still helps while UI/process is warm;
 * FGS tick is the locked-phone backstop.
 */
export function armGuidedRestEndTimer(sessionId: string, fireAtMs: number): void {
  if (!sessionId || !Number.isFinite(fireAtMs)) return;

  const existing = armedBySession.get(sessionId);
  if (existing) {
    clearHandle(existing);
  }

  const entry: ArmedRestEnd = {
    fireAtMs,
    handle: null,
    firing: false,
  };
  armedBySession.set(sessionId, entry);

  const delay = delayMsUntilRestEnd(fireAtMs);
  entry.handle = setTimeout(() => {
    entry.handle = null;
    void fireGuidedRestEndTimer(sessionId, fireAtMs);
  }, delay);

  logger.debug('[GUIDED_REST_END_TIMER] armed', {
    sessionId,
    fireAt: new Date(fireAtMs).toISOString(),
    delayMs: delay,
  });
}

export function cancelGuidedRestEndTimer(sessionId: string, reason?: string): void {
  const existing = armedBySession.get(sessionId);
  if (!existing) return;
  clearHandle(existing);
  armedBySession.delete(sessionId);
  logger.debug('[GUIDED_REST_END_TIMER] cancelled', { sessionId, reason: reason ?? 'unspecified' });
}

export function cancelAllGuidedRestEndTimers(reason?: string): void {
  for (const sessionId of [...armedBySession.keys()]) {
    cancelGuidedRestEndTimer(sessionId, reason ?? 'cancel_all');
  }
}

/** Sessions currently armed (test / debug). */
export function getArmedGuidedRestEndSessionIds(): string[] {
  return [...armedBySession.keys()];
}

/**
 * FGS loop backstop: fire any armed deadline that is due (setTimeout may lag
 * under OEM throttling even with a foreground service).
 */
export function tickGuidedRestEndTimers(nowMs: number = Date.now()): void {
  for (const [sessionId, entry] of armedBySession.entries()) {
    if (entry.firing) continue;
    if (nowMs < entry.fireAtMs) continue;
    void fireGuidedRestEndTimer(sessionId, entry.fireAtMs);
  }
}

async function fireGuidedRestEndTimer(sessionId: string, expectedFireAtMs: number): Promise<void> {
  const entry = armedBySession.get(sessionId);
  if (!entry || entry.fireAtMs !== expectedFireAtMs) return;
  if (entry.firing) return;
  entry.firing = true;
  clearHandle(entry);

  try {
    const { getIntent } = await import('@/lib/notifications/NotificationIntentStore');
    const { trainingTimedIntentKey } = await import('@/lib/notifications/trainingNotificationKeys');
    const key = trainingTimedIntentKey(sessionId);
    const intent = await getIntent(key);
    const data = intent?.data as Record<string, any> | undefined;
    const intentScheduledAtMs = data?.scheduledAt ? Date.parse(String(data.scheduledAt)) : null;

    let sessionEnded = false;
    try {
      const { getTrainingSession } = await import('@/lib/api');
      const { session } = await getTrainingSession(sessionId);
      sessionEnded = !!(session as { ended_at?: string | null } | null)?.ended_at;
    } catch (err) {
      if (__DEV__) {
        logger.debug('[GUIDED_REST_END_TIMER] session read failed — continue from intent', {
          sessionId,
          error: err,
        });
      }
    }

    if (
      !shouldPresentGuidedRestEnd({
        intentExists: !!data,
        firedAt: data?.firedAt,
        expectedFireAtMs,
        intentScheduledAtMs,
        sessionEnded,
      })
    ) {
      logger.debug('[GUIDED_REST_END_TIMER] skip present', {
        sessionId,
        hasIntent: !!data,
        firedAt: data?.firedAt ?? null,
        sessionEnded,
      });
      return;
    }

    const { setIntent } = await import('@/lib/notifications/NotificationIntentStore');
    const { reconcileNotifications } = await import('@/lib/notifications/NotificationScheduler');
    const { dismissTrainingNowPresented } = await import(
      '@/lib/notifications/trainingNotificationScheduler'
    );

    await setIntent(key, {
      ...data,
      deliverNow: true,
    });
    await reconcileNotifications();
    await dismissTrainingNowPresented(sessionId);

    logger.debug('[GUIDED_REST_END_TIMER] presented via deliverNow', {
      sessionId,
      expectedFireAt: new Date(expectedFireAtMs).toISOString(),
    });
  } catch (err) {
    logger.warn('[GUIDED_REST_END_TIMER] fire failed', { sessionId, error: err });
  } finally {
    const current = armedBySession.get(sessionId);
    if (current && current.fireAtMs === expectedFireAtMs) {
      armedBySession.delete(sessionId);
    }
  }
}
