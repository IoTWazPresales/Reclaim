/**
 * Lock-screen Start / Done for HEALTH_TRIGGER mindfulness nudges.
 * Starts a real session runtime (FGS) without requiring unlock — Option B.
 */
import { logger } from '@/lib/logger';
import { logMindfulnessEvent } from '@/lib/api';
import type { InterventionKey } from '@/lib/mindfulness';
import { setIntent, clearIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import {
  clearMindfulnessActiveSession,
  durationSecForIntervention,
  loadMindfulnessActiveSession,
  saveMindfulnessActiveSession,
  type MindfulnessActiveSession,
} from '@/lib/mindfulness/mindfulnessSessionState';
import {
  startMindfulnessSessionFgs,
  stopMindfulnessSessionFgs,
} from '@/lib/mindfulness/mindfulnessSessionFgs';

export const MINDFULNESS_SESSION_INTENT_KEY = 'mindfulness_session_active';

function normalizeIntervention(raw: string | undefined): InterventionKey | 'breath_478' {
  if (raw === 'breath_478') return 'breath_478';
  if (
    raw === 'box_breath_60' ||
    raw === 'five_senses' ||
    raw === 'reality_check' ||
    raw === 'urge_surf'
  ) {
    return raw;
  }
  return 'box_breath_60';
}

function interventionForLog(k: InterventionKey | 'breath_478'): string {
  return k === 'breath_478' ? 'box_breath_60' : k;
}

async function postActiveSessionIntent(session: MindfulnessActiveSession): Promise<void> {
  await setIntent(
    MINDFULNESS_SESSION_INTENT_KEY,
    {
      type: 'MINDFULNESS_SESSION',
      sessionId: session.sessionId,
      intervention: session.intervention,
      startedAt: session.startedAt,
      title: 'Mindfulness in progress',
      body: 'Tap Done when finished — or open the app to follow along.',
      channelId: 'mindfulness-health',
    },
    { ttlMinutes: 30 },
  );
  await reconcileNotifications();
}

export async function startMindfulnessFromNotification(opts: {
  intervention?: string;
}): Promise<boolean> {
  const existing = await loadMindfulnessActiveSession();
  if (existing) {
    // Idempotent Start: refresh FGS + active tile.
    await startMindfulnessSessionFgs(existing.sessionId, existing.durationSec);
    await postActiveSessionIntent(existing);
    return true;
  }

  const intervention = normalizeIntervention(opts.intervention);
  const sessionId =
    (globalThis.crypto as { randomUUID?: () => string } | undefined)?.randomUUID?.() ??
    `mf-${Date.now()}`;
  const session: MindfulnessActiveSession = {
    sessionId,
    intervention,
    startedAt: new Date().toISOString(),
    durationSec: durationSecForIntervention(intervention),
    source: 'notification',
  };

  await saveMindfulnessActiveSession(session);

  try {
    await logMindfulnessEvent({
      trigger_type: 'reminder',
      reason: 'lock_screen_start',
      intervention: interventionForLog(intervention),
      outcome: null,
      ctx: {
        type: intervention === 'breath_478' ? '478_breathing' : intervention === 'box_breath_60' ? 'box_breathing' : {},
        sessionId,
        lockScreenStart: true,
      },
    });
  } catch (e) {
    logger.warn('[MINDFUL_ACTION] start log failed (session still active)', e);
  }

  const fgsOk = await startMindfulnessSessionFgs(session.sessionId, session.durationSec);
  if (!fgsOk) {
    logger.warn('[MINDFUL_ACTION] FGS did not start — session persisted; Done still works when app wakes');
  }

  await postActiveSessionIntent(session);
  return true;
}

export async function completeMindfulnessSessionFromRuntime(
  reason: 'done_action' | 'fgs_timer' | 'ui',
): Promise<boolean> {
  const session = await loadMindfulnessActiveSession();
  if (!session) return false;

  try {
    await logMindfulnessEvent({
      trigger_type: 'reminder',
      reason: reason === 'fgs_timer' ? 'auto_complete' : 'user_request',
      intervention: interventionForLog(session.intervention),
      outcome: 'completed',
      ctx: {
        sessionId: session.sessionId,
        completeReason: reason,
        lockScreenStart: session.source === 'notification',
      },
    });
  } catch (e) {
    logger.warn('[MINDFUL_ACTION] complete log failed', e);
    // Still tear down so we do not leave a zombie FGS forever.
  }

  try {
    const { recordStreakEvent } = await import('@/lib/streaks');
    await recordStreakEvent('mindfulness', new Date());
  } catch {
    /* non-blocking */
  }

  await clearMindfulnessActiveSession();
  await stopMindfulnessSessionFgs(reason);
  await clearIntent(MINDFULNESS_SESSION_INTENT_KEY);
  await reconcileNotifications();
  return true;
}

export async function handleMindfulnessNotificationAction(opts: {
  action: string;
  intervention?: string;
  sessionId?: string;
}): Promise<boolean> {
  const { action } = opts;
  if (action === 'START') {
    return startMindfulnessFromNotification({ intervention: opts.intervention });
  }
  if (action === 'DONE' || action === 'COMPLETE') {
    const active = await loadMindfulnessActiveSession();
    if (opts.sessionId && active && active.sessionId !== opts.sessionId) {
      logger.debug('[MINDFUL_ACTION] DONE ignored — session mismatch', {
        expected: opts.sessionId,
        active: active.sessionId,
      });
      return false;
    }
    return completeMindfulnessSessionFromRuntime('done_action');
  }
  return false;
}
