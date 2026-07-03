/**
 * Canonical session end — full summary + optional Health Connect calories.
 * Used by in-app Complete and alert-driven End & save.
 */

import { getTrainingSession, updateTrainingSession, type TrainingSessionItemRow } from '@/lib/api';
import { logTrainingEvent } from '@/data/TrainingRepository';
import { computeSessionSummaryFromItems } from '@/lib/training/sessionDerivedState';
import { mergeHealthConnectActiveEnergyIntoTrainingSummary } from '@/lib/health/healthConnectService';
import { enqueueOperation } from '@/lib/training/offlineQueue';
import { isNetworkAvailable } from '@/lib/training/offlineSync';
import {
  TRAINING_SESSION_BUFFER_WRITES_ENABLED,
  flushBufferedSessionWrites,
} from '@/lib/training/sessionWriteBuffer';
import { logger } from '@/lib/logger';
import { clearTrainingIntentsForSession } from '@/lib/notifications/trainingNotificationScheduler';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';

export type FinalizeTrainingSessionInput = {
  sessionId: string;
  /** When omitted, loads fresh items from DB. */
  items?: TrainingSessionItemRow[];
  startedAt?: string | null;
  existingSummary?: Record<string, unknown> | null;
  flushWriteBuffer?: boolean;
};

export type FinalizeTrainingSessionResult = {
  endedAt: string;
  wroteOnline: boolean;
  summary: Record<string, unknown>;
  bufferFlushFailed?: number;
};

export async function finalizeTrainingSession(
  input: FinalizeTrainingSessionInput,
): Promise<FinalizeTrainingSessionResult> {
  const endedAt = new Date().toISOString();
  let items = input.items;
  let startedAt = input.startedAt ?? null;

  if (!items) {
    const loaded = await getTrainingSession(input.sessionId);
    items = loaded.items;
    startedAt = loaded.session.started_at;
  }

  let bufferFlushFailed = 0;
  if (input.flushWriteBuffer !== false && TRAINING_SESSION_BUFFER_WRITES_ENABLED) {
    const flushResult = await flushBufferedSessionWrites(input.sessionId);
    bufferFlushFailed = flushResult.failed;
    if (flushResult.failed > 0) {
      logger.warn('[finalizeTrainingSession] buffered set logs failed to flush', {
        sessionId: input.sessionId,
        failed: flushResult.failed,
      });
    }
  }

  const sessionSummary = computeSessionSummaryFromItems(items, startedAt, endedAt);
  const energyExtras = await mergeHealthConnectActiveEnergyIntoTrainingSummary(
    startedAt,
    endedAt,
    input.existingSummary ?? null,
  );

  const exercisesCompleted = items.filter(
    (i) => !i.skipped && (i.performed?.sets?.length ?? 0) > 0,
  ).length;
  const exercisesSkipped = items.filter((i) => i.skipped).length;

  const summary = {
    durationMinutes: Math.round(sessionSummary.elapsedSeconds / 60),
    exercisesCompleted,
    exercisesSkipped,
    totalVolume: sessionSummary.totalVolume,
    totalSets: sessionSummary.totalSets,
    prs: [] as unknown[],
    ...energyExtras,
  };

  const networkAvailable = await isNetworkAvailable();
  let wroteOnline = false;

  if (networkAvailable) {
    await updateTrainingSession(input.sessionId, { endedAt, summary });
    wroteOnline = true;
    await logTrainingEvent('training_session_completed', {
      sessionId: input.sessionId,
      durationMinutes: summary.durationMinutes,
      prsCount: 0,
      exercisesCompleted,
      exercisesSkipped,
      totalVolume: summary.totalVolume,
    }).catch((e) => {
      if (__DEV__) logger.debug('[finalizeTrainingSession]', e);
    });
  } else {
    await enqueueOperation({
      type: 'finalizeSession',
      sessionId: input.sessionId,
      payload: { endedAt, summary },
      timestamp: endedAt,
    });
  }

  return {
    endedAt,
    wroteOnline,
    summary,
    bufferFlushFailed: bufferFlushFailed > 0 ? bufferFlushFailed : undefined,
  };
}

/** Clear guided-training notification intents for a session. */
export async function clearTrainingSessionNotificationIntents(sessionId: string): Promise<void> {
  await clearTrainingIntentsForSession(sessionId);
  await reconcileNotifications();
}

/** Finalize session and clear training notification intents (alert End + in-app Complete). */
export async function finalizeTrainingSessionAndCleanup(
  input: FinalizeTrainingSessionInput,
): Promise<FinalizeTrainingSessionResult> {
  const result = await finalizeTrainingSession(input);
  try {
    await clearTrainingSessionNotificationIntents(input.sessionId);
  } catch (err) {
    logger.warn('[finalizeTrainingSessionAndCleanup] intent clear failed', err);
  }
  return result;
}
