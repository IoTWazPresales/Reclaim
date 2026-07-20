/**
 * Training notification scheduling — dumb triggers only.
 *
 * A training notification carries `sessionId`, an action-verb context (`type`,
 * mapped to a notification category) and display strings. It NEVER embeds a
 * snapshot of the session plan (no next/nextAfter lookahead). On any action tap
 * the handler reads the DB and derives the next step via
 * `sessionWorkAuthority.deriveActiveWorkTarget` — fire-time derivation, never
 * payload snapshots.
 *
 * Intent slots (one notification identity per session, updated in place):
 * - `training_now:{sessionId}`  — the immediate prompt (session started / next set / rest started)
 * - `training_at:{sessionId}`   — one scheduled trigger with an absolute timestamp (rest end / prep countdown)
 *
 * Both slots map to the same OS notification identifier
 * (`reclaim-training-{sessionId}`), so the lock-screen tile is replaced in
 * place instead of stacking.
 */
import { setIntent, clearIntent, clearIntentsByPrefix } from './NotificationIntentStore';
import { reconcileNotifications } from './NotificationScheduler';
import { logger } from '@/lib/logger';
import {
  LEGACY_TRAINING_INTENT_PREFIXES,
  trainingActiveIntentKey,
  trainingActiveNotificationIdentifier,
  trainingNowIntentKey,
  trainingStaleIntentKey,
  trainingTimedIntentKey,
} from './trainingNotificationKeys';

export {
  trainingNowIntentKey,
  trainingTimedIntentKey,
  trainingStaleIntentKey,
  trainingActiveIntentKey,
  trainingNotificationIdentifier,
  trainingStaleNotificationIdentifier,
  trainingActiveNotificationIdentifier,
} from './trainingNotificationKeys';

type ScheduleOptions = {
  deferReconcile?: boolean;
};

export type TrainingPromptKind = 'set' | 'rest';

function typeForKind(kind: TrainingPromptKind): 'TRAINING_SET' | 'TRAINING_REST' {
  return kind === 'rest' ? 'TRAINING_REST' : 'TRAINING_SET';
}

/**
 * Show the "now" prompt for a session (immediate notification, replaces the
 * previous one in place). `kind: 'set'` renders Done/Skip/Edit actions;
 * `kind: 'rest'` renders the Next-set action and an optional countdown chronometer.
 */
export async function scheduleTrainingNowPrompt(
  params: {
    sessionId: string;
    kind: TrainingPromptKind;
    title: string;
    body: string;
    /** Absolute ms epoch when rest ends (chronometer display, rest prompts only). */
    restEndsAtMs?: number;
  },
  options?: ScheduleOptions,
): Promise<string> {
  const key = trainingNowIntentKey(params.sessionId);
  const payload: Record<string, any> = {
    type: typeForKind(params.kind),
    sessionId: params.sessionId,
    title: params.title,
    body: params.body,
    issuedAt: new Date().toISOString(),
  };
  if (params.kind === 'rest' && params.restEndsAtMs != null) {
    payload.chronometerCountDown = true;
    payload.chronometerBaseTime = params.restEndsAtMs;
  }
  await setIntent(key, payload);
  logger.debug('[TRAINING_NOTIF] now prompt intent set', { key, kind: params.kind });
  if (!options?.deferReconcile) {
    await reconcileNotifications();
  }
  return key;
}

/**
 * Schedule the timed prompt for a session at an absolute timestamp.
 * Reconcile never re-materializes this intent once `scheduledAt` has passed.
 */
export async function scheduleTrainingTimedPrompt(
  params: {
    sessionId: string;
    kind: TrainingPromptKind;
    title: string;
    body: string;
    /** Absolute ms epoch when the prompt fires. */
    fireAtMs: number;
  },
  options?: ScheduleOptions,
): Promise<string> {
  const key = trainingTimedIntentKey(params.sessionId);
  const payload: Record<string, any> = {
    type: typeForKind(params.kind),
    sessionId: params.sessionId,
    title: params.title,
    body: params.body,
    issuedAt: new Date().toISOString(),
    scheduledAt: new Date(params.fireAtMs).toISOString(),
  };
  await setIntent(key, payload);
  logger.debug('[TRAINING_NOTIF] timed prompt intent set', {
    key,
    kind: params.kind,
    scheduledAt: payload.scheduledAt,
  });
  if (!options?.deferReconcile) {
    await reconcileNotifications();
  }
  return key;
}

/** Clear the timed prompt slot (e.g. rest skipped / extended). */
export async function clearTrainingTimedPrompt(sessionId: string): Promise<void> {
  await clearIntent(trainingTimedIntentKey(sessionId));
}

/**
 * Clear both notification intent slots for a session (and any legacy per-set
 * intents from the old pipeline). Does NOT reconcile — callers decide when.
 */
export async function clearTrainingIntentsForSession(sessionId: string): Promise<void> {
  await clearIntent(trainingNowIntentKey(sessionId));
  await clearIntent(trainingTimedIntentKey(sessionId));
  await clearIntent(trainingStaleIntentKey(sessionId));
  await clearIntent(trainingActiveIntentKey(sessionId));
  for (const prefix of LEGACY_TRAINING_INTENT_PREFIXES) {
    await clearIntentsByPrefix(`${prefix}${sessionId}:`);
  }
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.dismissNotificationAsync(trainingActiveNotificationIdentifier(sessionId));
  } catch {
    // best-effort dismiss of sticky session-active tile
  }
}

/**
 * Ongoing low-urgency "session in progress" tile — separate from set/rest actions.
 * Improves Wear/lock action delivery by keeping the process foreground-eligible.
 */
export async function scheduleTrainingSessionActive(
  params: {
    sessionId: string;
    body?: string;
  },
  options?: ScheduleOptions,
): Promise<string> {
  const key = trainingActiveIntentKey(params.sessionId);
  await setIntent(key, {
    type: 'TRAINING_SESSION_ACTIVE',
    sessionId: params.sessionId,
    title: 'Reclaim training in progress',
    body: params.body ?? 'Guided session active — Done on your watch updates this phone.',
    issuedAt: new Date().toISOString(),
  });
  logger.debug('[TRAINING_NOTIF] session-active intent set', { key });
  if (!options?.deferReconcile) {
    await reconcileNotifications();
  }
  return key;
}

/**
 * Schedule / refresh proactive "session still open?" at threshold from now.
 * Uses a separate OS notification id so it does not replace set/rest tiles.
 */
export async function scheduleTrainingStaleSessionCheck(
  sessionId: string,
  fireAfterMs: number,
  options?: ScheduleOptions,
): Promise<string> {
  const key = trainingStaleIntentKey(sessionId);
  const fireAt = Date.now() + Math.max(60_000, fireAfterMs);
  await setIntent(key, {
    type: 'TRAINING_STALE',
    sessionId,
    title: 'Still training?',
    body: 'This session has been open a long time. Open Reclaim to finish and save, or resume if you are still going.',
    scheduledAt: new Date(fireAt).toISOString(),
    issuedAt: new Date().toISOString(),
  });
  logger.debug('[TRAINING_NOTIF] stale check intent set', { key, fireAt: new Date(fireAt).toISOString() });
  if (!options?.deferReconcile) {
    await reconcileNotifications();
  }
  return key;
}

/**
 * Clear stale training intents when no session is in progress.
 * Call on app foreground to prevent "Rest complete" / "Session started" notifications
 * after user abandoned a session (force-closed, navigated away).
 * On listTrainingSessions failure (e.g. offline), keeps intents to avoid
 * accidentally dropping active guided-session notification chains.
 */
export async function clearStaleTrainingIntentsIfNoActiveSession(): Promise<void> {
  let inProgress = false;
  let sessionsLoaded = false;
  // Sessions older than 12 hours without an ended_at are treated as ghost sessions
  // (e.g. crash / force-close without proper cleanup). Don't block stale intent clearing for them.
  const STALE_SESSION_THRESHOLD_MS = 12 * 60 * 60 * 1000;
  const staleThreshold = new Date(Date.now() - STALE_SESSION_THRESHOLD_MS).toISOString();
  try {
    const { listTrainingSessions } = await import('@/lib/api');
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('listTrainingSessions timeout')), 5000)
    );
    const sessions = await Promise.race([listTrainingSessions(10), timeoutPromise]);
    sessionsLoaded = true;
    inProgress = (sessions ?? []).some(
      (s: any) => s?.started_at && !s?.ended_at && s.started_at > staleThreshold,
    );
  } catch (e) {
    logger.debug('[TRAINING_NOTIF] listTrainingSessions failed, keeping intents:', (e as Error)?.message);
  }
  if (!sessionsLoaded) return;
  if (inProgress) return;

  try {
    await clearIntentsByPrefix('training_now:');
    await clearIntentsByPrefix('training_at:');
    await clearIntentsByPrefix('training_stale:');
    await clearIntentsByPrefix('training_active:');
    for (const prefix of LEGACY_TRAINING_INTENT_PREFIXES) {
      await clearIntentsByPrefix(prefix);
    }
    logger.debug('[TRAINING_NOTIF] Cleared stale intents (no active session)');
  } catch (e) {
    logger.debug('[TRAINING_NOTIF] clearIntents failed:', (e as Error)?.message);
  }
}
