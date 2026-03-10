import AsyncStorage from '@react-native-async-storage/async-storage';
import { logTrainingSet } from '@/data/TrainingRepository';
import { logger } from '@/lib/logger';
import { logTelemetry } from '@/lib/telemetry';
import { enqueueOperation } from './offlineQueue';

const BUFFER_KEY_PREFIX = '@reclaim/training/sessionWriteBuffer/';

// Feature flag: keep false so each completed set is written through immediately when online.
// This preserves backend-as-source-of-truth semantics for guided/watch actions while
// still falling back to the offline queue when persistence fails.
export const TRAINING_SESSION_BUFFER_WRITES_ENABLED = false;

export type BufferedSessionSetLog = {
  id: string;
  sessionId: string;
  sessionItemId: string;
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt: string;
  enqueuedAt: string;
};

type FlushResult = {
  flushed: number;
  queuedForRetry: number;
  failed: number;
  errors: string[];
};

const flushInFlight = new Map<string, Promise<FlushResult>>();

function keyForSession(sessionId: string): string {
  return `${BUFFER_KEY_PREFIX}${sessionId}`;
}

async function loadSessionBuffer(sessionId: string): Promise<BufferedSessionSetLog[]> {
  try {
    const raw = await AsyncStorage.getItem(keyForSession(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.warn('[TRAINING_BUFFER] Failed to load session buffer', { sessionId, error });
    return [];
  }
}

async function saveSessionBuffer(sessionId: string, entries: BufferedSessionSetLog[]): Promise<void> {
  try {
    if (entries.length === 0) {
      await AsyncStorage.removeItem(keyForSession(sessionId));
      return;
    }
    await AsyncStorage.setItem(keyForSession(sessionId), JSON.stringify(entries));
  } catch (error) {
    logger.warn('[TRAINING_BUFFER] Failed to save session buffer', { sessionId, error });
  }
}

export async function upsertBufferedSessionSetLog(
  input: Omit<BufferedSessionSetLog, 'enqueuedAt'>,
): Promise<void> {
  if (!TRAINING_SESSION_BUFFER_WRITES_ENABLED) return;

  const existing = await loadSessionBuffer(input.sessionId);
  const entry: BufferedSessionSetLog = {
    ...input,
    enqueuedAt: new Date().toISOString(),
  };
  // Replace by logical set identity, not by generated id, so edits do not duplicate writes.
  const idx = existing.findIndex(
    (candidate) =>
      candidate.sessionItemId === entry.sessionItemId && candidate.setIndex === entry.setIndex,
  );
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.push(entry);
  }
  await saveSessionBuffer(input.sessionId, existing);
}

export async function clearBufferedSessionWrites(sessionId: string): Promise<void> {
  await AsyncStorage.removeItem(keyForSession(sessionId));
}

export async function getBufferedSessionWriteCount(sessionId: string): Promise<number> {
  const entries = await loadSessionBuffer(sessionId);
  return entries.length;
}

export async function flushBufferedSessionWrites(sessionId: string): Promise<FlushResult> {
  if (!TRAINING_SESSION_BUFFER_WRITES_ENABLED) {
    return { flushed: 0, queuedForRetry: 0, failed: 0, errors: [] };
  }
  if (flushInFlight.has(sessionId)) {
    return flushInFlight.get(sessionId)!;
  }

  const task = (async (): Promise<FlushResult> => {
    const entries = await loadSessionBuffer(sessionId);
    if (!entries.length) {
      return { flushed: 0, queuedForRetry: 0, failed: 0, errors: [] };
    }

    let flushed = 0;
    let queuedForRetry = 0;
    let failed = 0;
    const errors: string[] = [];
    const failedEntries: BufferedSessionSetLog[] = [];

    for (const entry of entries) {
      try {
        await logTrainingSet({
          id: entry.id,
          sessionItemId: entry.sessionItemId,
          setIndex: entry.setIndex,
          weight: entry.weight,
          reps: entry.reps,
          rpe: entry.rpe,
        });
        flushed += 1;
      } catch (error: any) {
        failedEntries.push(entry);
        errors.push(
          `${entry.sessionItemId}:${entry.setIndex} ${error?.message ?? 'Unknown flush error'}`,
        );
      }
    }

    const survivors: BufferedSessionSetLog[] = [];
    for (const failedEntry of failedEntries) {
      try {
        await enqueueOperation({
          type: 'insertSetLog',
          sessionItemId: failedEntry.sessionItemId,
          id: failedEntry.id,
          payload: {
            setIndex: failedEntry.setIndex,
            weight: failedEntry.weight,
            reps: failedEntry.reps,
            rpe: failedEntry.rpe,
          },
          timestamp: new Date().toISOString(),
        });
        queuedForRetry += 1;
      } catch (error: any) {
        failed += 1;
        survivors.push(failedEntry);
        errors.push(
          `${failedEntry.sessionItemId}:${failedEntry.setIndex} queue ${error?.message ?? 'Unknown enqueue error'}`,
        );
      }
    }

    await saveSessionBuffer(sessionId, survivors);

    logger.debug('[TRAINING_BUFFER] Flush complete', {
      sessionId,
      flushed,
      queuedForRetry,
      failed,
    });
    void logTelemetry({
      name: 'training_buffer_flush_completed',
      properties: {
        sessionId,
        flushed,
        queuedForRetry,
        failed,
        bufferedCount: entries.length,
      },
      tags: ['TRAINING_BUFFER'],
    });

    return { flushed, queuedForRetry, failed, errors };
  })();

  flushInFlight.set(sessionId, task);
  try {
    return await task;
  } finally {
    flushInFlight.delete(sessionId);
  }
}
