/**
 * Lock-screen Start / Done for meditation reminders (Option B).
 * Starts meditationRuntime + FGS without unlock; voice attaches when UI opens.
 */
import { logger } from '@/lib/logger';
import {
  createMeditationStart,
  finishMeditation,
  upsertMeditation,
  type MeditationSession,
} from '@/lib/api';
import {
  clearActiveSession,
  completeSession,
  loadActiveSession,
  startSession,
} from '@/lib/meditationRuntime';
import {
  getMeditationDefaultDurationSec,
  startMeditationSessionFgs,
  stopMeditationSessionFgs,
} from '@/lib/meditation/meditationSessionFgs';
import { setIntent, clearIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import type { MeditationType } from '@/lib/meditations';

export const MEDITATION_SESSION_INTENT_KEY = 'meditation_session_active';

function asMeditationType(raw: unknown): MeditationType | undefined {
  return typeof raw === 'string' && raw.length > 0 ? (raw as MeditationType) : undefined;
}

async function postActiveSessionIntent(session: MeditationSession): Promise<void> {
  await setIntent(
    MEDITATION_SESSION_INTENT_KEY,
    {
      type: 'MEDITATION_SESSION',
      sessionId: session.id,
      meditationType: session.meditationType,
      startedAt: session.startTime,
      title: 'Meditation in progress',
      body: 'Open for voice guidance, or tap Done when finished.',
      channelId: 'meditation',
    },
    { ttlMinutes: 45 },
  );
  await reconcileNotifications();
}

export async function startMeditationFromNotification(opts: {
  meditationType?: string;
}): Promise<boolean> {
  const existing = await loadActiveSession();
  if (existing) {
    await startMeditationSessionFgs(existing.id, getMeditationDefaultDurationSec());
    await postActiveSessionIntent(existing);
    return true;
  }

  const newSession = createMeditationStart(undefined, asMeditationType(opts.meditationType));
  const result = await startSession(newSession);
  const session = result.session;

  const fgsOk = await startMeditationSessionFgs(session.id, getMeditationDefaultDurationSec());
  if (!fgsOk) {
    logger.warn('[MEDITATION_ACTION] FGS did not start — local session still active');
  }

  await postActiveSessionIntent(session);
  return true;
}

export async function completeMeditationSessionFromRuntime(
  reason: 'done_action' | 'fgs_timer' | 'ui',
): Promise<boolean> {
  const active = await loadActiveSession();
  if (!active) return false;

  const finished = finishMeditation(active);
  try {
    await upsertMeditation(finished);
  } catch (e) {
    logger.warn('[MEDITATION_ACTION] upsert failed', e);
  }

  await completeSession(active.id);
  await clearActiveSession();
  await stopMeditationSessionFgs(reason);
  await clearIntent(MEDITATION_SESSION_INTENT_KEY);
  await reconcileNotifications();

  logger.debug('[MEDITATION_ACTION] completed', { reason, sessionId: active.id });
  return true;
}

export async function handleMeditationNotificationAction(opts: {
  action: string;
  meditationType?: string;
  sessionId?: string;
}): Promise<boolean> {
  if (opts.action === 'START') {
    return startMeditationFromNotification({ meditationType: opts.meditationType });
  }
  if (opts.action === 'DONE' || opts.action === 'COMPLETE') {
    const active = await loadActiveSession();
    if (opts.sessionId && active && active.id !== opts.sessionId) {
      return false;
    }
    return completeMeditationSessionFromRuntime('done_action');
  }
  return false;
}
