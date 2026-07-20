/**
 * Session close authority — durable ended_at first, enrichment second.
 * All Finish / last-set / stale Discard / Wear last-set paths should use this.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTrainingSession, updateTrainingSession, type TrainingSessionItemRow } from '@/lib/api';
import { logTrainingEvent } from '@/data/TrainingRepository';
import { computeSessionSummaryFromItems } from '@/lib/training/sessionDerivedState';
import { mergeHealthConnectActiveEnergyIntoTrainingSummary } from '@/lib/health/healthConnectService';
import {
  consumeOpenTrainingSessionStart,
  writeTrainingExerciseSessionToHealthConnect,
} from '@/lib/health/exerciseSessionWriter';
import { enqueueOperation, loadOfflineQueue } from '@/lib/training/offlineQueue';
import {
  TRAINING_SESSION_BUFFER_WRITES_ENABLED,
  flushBufferedSessionWrites,
} from '@/lib/training/sessionWriteBuffer';
import { logger } from '@/lib/logger';
import { clearTrainingIntentsForSession } from '@/lib/notifications/trainingNotificationScheduler';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import { buildNotificationWorkChain } from '@/lib/training/trainingSessionProgression';

const PENDING_CLOSE_KEY = '@reclaim/training/pending_close_v1';
/** Bound every network/native await on the durable-close path. */
export const CLOSE_PHASE1_TIMEOUT_MS = 10_000;

export type CloseTrainingSessionInput = {
  sessionId: string;
  items?: TrainingSessionItemRow[];
  startedAt?: string | null;
  existingSummary?: Record<string, unknown> | null;
  flushWriteBuffer?: boolean;
};

export type CloseTrainingSessionResult = {
  endedAt: string;
  wroteOnline: boolean;
  summary: Record<string, unknown>;
  bufferFlushFailed?: number;
  pendingClose: boolean;
};

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readPendingCloseMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_CLOSE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writePendingCloseMap(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(PENDING_CLOSE_KEY, JSON.stringify(map));
}

/** Local + queue marker so auto-resume cannot resurrect a session we already closed. */
export async function markSessionPendingClose(sessionId: string, endedAt: string): Promise<void> {
  const map = await readPendingCloseMap();
  map[sessionId] = endedAt;
  await writePendingCloseMap(map);
}

export async function clearSessionPendingClose(sessionId: string): Promise<void> {
  const map = await readPendingCloseMap();
  if (!(sessionId in map)) return;
  delete map[sessionId];
  await writePendingCloseMap(map);
}

export async function hasPendingClose(sessionId: string): Promise<boolean> {
  const map = await readPendingCloseMap();
  if (map[sessionId]) return true;
  try {
    const queue = await loadOfflineQueue();
    return queue.some((op) => op.type === 'finalizeSession' && op.sessionId === sessionId);
  } catch {
    return false;
  }
}

/** True when every non-skipped exercise has no pending planned sets left. */
export function isSessionWorkComplete(items: TrainingSessionItemRow[]): boolean {
  return buildNotificationWorkChain(items).sessionComplete;
}

function buildMinimalSummary(
  items: TrainingSessionItemRow[],
  startedAt: string | null,
  endedAt: string,
  existingSummary?: Record<string, unknown> | null,
): Record<string, unknown> {
  const sessionSummary = computeSessionSummaryFromItems(items, startedAt, endedAt);
  const exercisesCompleted = items.filter(
    (i) => !i.skipped && (i.performed?.sets?.length ?? 0) > 0,
  ).length;
  const exercisesSkipped = items.filter((i) => i.skipped).length;
  return {
    ...(existingSummary ?? {}),
    durationMinutes: Math.round(sessionSummary.elapsedSeconds / 60),
    exercisesCompleted,
    exercisesSkipped,
    totalVolume: sessionSummary.totalVolume,
    totalSets: sessionSummary.totalSets,
    prs: Array.isArray((existingSummary as { prs?: unknown })?.prs)
      ? (existingSummary as { prs: unknown[] }).prs
      : [],
  };
}

/**
 * Phase 2 — best-effort HC / energy enrichment. Never blocks durable close.
 */
export async function enrichClosedSessionInBackground(args: {
  sessionId: string;
  startedAt: string | null;
  endedAt: string;
  summary: Record<string, unknown>;
}): Promise<void> {
  try {
    const sessionStartIso = args.startedAt ?? consumeOpenTrainingSessionStart();
    let hcSessionExtras: Record<string, unknown> = {};
    if (sessionStartIso) {
      const hcWrite = await withTimeout(
        writeTrainingExerciseSessionToHealthConnect(sessionStartIso, args.endedAt),
        CLOSE_PHASE1_TIMEOUT_MS,
        'hcWrite',
      ).catch((e) => {
        if (__DEV__) logger.debug('[closeTrainingSession] HC write skipped', e);
        return { wrote: false as const };
      });
      if (hcWrite && 'wrote' in hcWrite && hcWrite.wrote) {
        hcSessionExtras = {
          exerciseSessionWritten: true,
          ...(hcWrite.activeCaloriesKcal != null ? { activeCaloriesKcal: hcWrite.activeCaloriesKcal } : {}),
          ...(hcWrite.avgHeartRateBpm != null ? { avgHeartRateBpm: hcWrite.avgHeartRateBpm } : {}),
        };
      }
    }

    const energyExtras = await withTimeout(
      mergeHealthConnectActiveEnergyIntoTrainingSummary(sessionStartIso ?? args.startedAt, args.endedAt, {
        ...args.summary,
        ...hcSessionExtras,
      }),
      CLOSE_PHASE1_TIMEOUT_MS,
      'hcEnergy',
    ).catch(() => args.summary);

    await withTimeout(
      updateTrainingSession(args.sessionId, {
        endedAt: args.endedAt,
        summary: energyExtras,
      }),
      CLOSE_PHASE1_TIMEOUT_MS,
      'summaryEnrich',
    ).catch((e) => {
      if (__DEV__) logger.debug('[closeTrainingSession] enrich update skipped', e);
    });
  } catch (e) {
    if (__DEV__) logger.debug('[closeTrainingSession] enrich failed', e);
  }
}

/**
 * Durable session close (Phase 1). Writes ended_at before any HC work.
 */
export async function closeTrainingSession(
  input: CloseTrainingSessionInput,
): Promise<CloseTrainingSessionResult> {
  const endedAt = new Date().toISOString();
  // Mark pending before any network so auto-resume cannot resurrect on load failure.
  await markSessionPendingClose(input.sessionId, endedAt);

  let items = input.items;
  let startedAt = input.startedAt ?? null;

  if (!items) {
    try {
      const loaded = await withTimeout(
        getTrainingSession(input.sessionId),
        CLOSE_PHASE1_TIMEOUT_MS,
        'getTrainingSession',
      );
      items = loaded.items;
      startedAt = loaded.session.started_at;
    } catch (e) {
      logger.warn('[closeTrainingSession] load failed — enqueue minimal close', e);
      const summary = {
        ...(input.existingSummary ?? {}),
        durationMinutes: 0,
        exercisesCompleted: 0,
        exercisesSkipped: 0,
        totalVolume: 0,
        totalSets: 0,
        closedWithoutItems: true,
      };
      await enqueueOperation({
        type: 'finalizeSession',
        sessionId: input.sessionId,
        payload: { endedAt, summary },
        timestamp: endedAt,
      });
      try {
        await clearTrainingIntentsForSession(input.sessionId);
        await reconcileNotifications();
      } catch (err) {
        logger.warn('[closeTrainingSession] intent clear failed', err);
      }
      return {
        endedAt,
        wroteOnline: false,
        summary,
        pendingClose: true,
      };
    }
  }

  let bufferFlushFailed = 0;
  if (input.flushWriteBuffer !== false && TRAINING_SESSION_BUFFER_WRITES_ENABLED) {
    try {
      const flushResult = await withTimeout(
        flushBufferedSessionWrites(input.sessionId),
        CLOSE_PHASE1_TIMEOUT_MS,
        'flushBuffer',
      );
      bufferFlushFailed = flushResult.failed;
    } catch (e) {
      logger.warn('[closeTrainingSession] buffer flush timed out / failed', e);
      bufferFlushFailed = 1;
    }
  }

  const summary = buildMinimalSummary(items, startedAt, endedAt, input.existingSummary);

  let wroteOnline = false;
  try {
    await withTimeout(
      updateTrainingSession(input.sessionId, { endedAt, summary }),
      CLOSE_PHASE1_TIMEOUT_MS,
      'updateTrainingSession',
    );
    wroteOnline = true;
    await clearSessionPendingClose(input.sessionId);
    logTrainingEvent('training_session_completed', {
      sessionId: input.sessionId,
      durationMinutes: summary.durationMinutes,
      prsCount: 0,
      exercisesCompleted: summary.exercisesCompleted,
      exercisesSkipped: summary.exercisesSkipped,
      totalVolume: summary.totalVolume,
    }).catch((e) => {
      if (__DEV__) logger.debug('[closeTrainingSession]', e);
    });
  } catch (e) {
    logger.warn('[closeTrainingSession] online close failed — enqueue finalizeSession', e);
    await enqueueOperation({
      type: 'finalizeSession',
      sessionId: input.sessionId,
      payload: { endedAt, summary },
      timestamp: endedAt,
    });
  }

  try {
    await clearTrainingIntentsForSession(input.sessionId);
    await reconcileNotifications();
  } catch (err) {
    logger.warn('[closeTrainingSession] intent clear failed', err);
  }

  // Phase 2 — do not await.
  void enrichClosedSessionInBackground({
    sessionId: input.sessionId,
    startedAt,
    endedAt,
    summary,
  });

  return {
    endedAt,
    wroteOnline,
    summary,
    bufferFlushFailed: bufferFlushFailed > 0 ? bufferFlushFailed : undefined,
    pendingClose: !wroteOnline,
  };
}

/** Back-compat wrapper used by existing call sites. */
export async function finalizeTrainingSessionAndCleanup(
  input: CloseTrainingSessionInput,
): Promise<CloseTrainingSessionResult> {
  return closeTrainingSession(input);
}
