// Training Offline Queue - Persist queued ops when network is unavailable; SQLite mirror is canonical for signed-in users.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ASYNC_MIRROR_DOMAIN,
  loadBlobMirrorForUser,
  replaceTrainingOfflineQueueMirror,
} from '@/lib/localData/smallModuleMirrors';
import { initializeLocalDatabase } from '@/lib/localData/database';
import { logger } from '../logger';
import { supabase } from '@/lib/supabase';

import {
  type OfflineOperation,
  isValidOfflineQueuePayload,
} from '@/lib/training/offlineQueueSchema';

export type { OfflineOperation };
export { isValidOfflineQueuePayload };

const QUEUE_KEY = '@reclaim/training/offline_queue';
const MAX_RETRIES = 8;
const BASE_BACKOFF_MS = 5_000;

export function isRetryReady(op: OfflineOperation): boolean {
  const count = op.retryCount ?? 0;
  if (count >= MAX_RETRIES) return false;
  if (!op.lastAttemptAt) return true;
  const elapsed = Date.now() - new Date(op.lastAttemptAt).getTime();
  const backoff = BASE_BACKOFF_MS * Math.pow(2, Math.min(count, 6));
  return elapsed >= backoff;
}

export function markRetryAttempt(op: OfflineOperation): OfflineOperation {
  return { ...op, retryCount: (op.retryCount ?? 0) + 1, lastAttemptAt: new Date().toISOString() };
}

function parseOfflineQueueFromAsyncStorage(raw: string | null): OfflineOperation[] | null {
  if (raw === null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    if (!isValidOfflineQueuePayload(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function alignLegacyAsyncStorage(queue: OfflineOperation[]): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (raw === JSON.stringify(queue)) return;
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function persistOfflineQueue(queue: OfflineOperation[]): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      await replaceTrainingOfflineQueueMirror(queue);
    }
  } catch (e) {
    logger.warn('[TRAINING_QUEUE] localData queue save failed; AsyncStorage still updated', e);
  }
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    logger.warn('Failed to save offline queue', error);
  }
}

/**
 * Load offline queue from storage (AsyncStorage + SQLite canonical mirror for signed-in users).
 */
export async function loadOfflineQueue(): Promise<OfflineOperation[]> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      const init = await initializeLocalDatabase();
      if (init.ok) {
        const blob = await loadBlobMirrorForUser(ASYNC_MIRROR_DOMAIN.trainingOfflineQueue, uid);
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        const fromAs = parseOfflineQueueFromAsyncStorage(raw);

        if (blob !== null && isValidOfflineQueuePayload(blob) && blob.length > 0) {
          await alignLegacyAsyncStorage(blob);
          return blob;
        }

        if (fromAs !== null) {
          await replaceTrainingOfflineQueueMirror(fromAs);
          if (fromAs.length > 0) {
            logger.info('[TRAINING_QUEUE] Migrated legacy AsyncStorage queue to localData', {
              count: fromAs.length,
            });
          }
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(fromAs));
          return fromAs;
        }

        return [];
      }
    }
  } catch (e) {
    logger.warn('[TRAINING_QUEUE] canonical queue read failed', e);
  }

  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const fromAs = parseOfflineQueueFromAsyncStorage(raw);
  if (fromAs !== null) return fromAs;

  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return [];
    const blob = await loadBlobMirrorForUser(ASYNC_MIRROR_DOMAIN.trainingOfflineQueue, uid);
    if (!blob || !isValidOfflineQueuePayload(blob) || blob.length === 0) return [];
    logger.info('[TRAINING_QUEUE] Restored queue from SQLite (fallback path)', {
      count: blob.length,
    });
    await persistOfflineQueue(blob);
    return blob;
  } catch (e) {
    logger.warn('[TRAINING_QUEUE] SQLite queue restore failed', e);
    return [];
  }
}

/**
 * Save offline queue to storage
 */
export async function saveOfflineQueue(queue: OfflineOperation[]): Promise<void> {
  await persistOfflineQueue(queue);
}

/**
 * Add operation to offline queue
 */
export async function enqueueOperation(operation: OfflineOperation): Promise<void> {
  logger.debug('[TRAINING_QUEUE] enqueue', { type: operation.type, id: getOperationIdForLog(operation) });
  const queue = await loadOfflineQueue();
  queue.push(operation);
  await persistOfflineQueue(queue);
}

function getOperationIdForLog(op: OfflineOperation): string {
  switch (op.type) {
    case 'createSession':
      return op.id;
    case 'upsertItem':
      return op.itemId;
    case 'insertSetLog':
      return op.id;
    case 'finalizeSession':
      return op.sessionId;
    default:
      return 'unknown';
  }
}

/**
 * Remove operation from queue (after successful sync)
 */
export async function dequeueOperation(operationId: string): Promise<void> {
  const queue = await loadOfflineQueue();
  const filtered = queue.filter((op) => {
    if (op.type === 'createSession' && op.id === operationId) return false;
    if (op.type === 'upsertItem' && op.itemId === operationId) return false;
    if (op.type === 'insertSetLog' && op.id === operationId) return false;
    if (op.type === 'finalizeSession' && op.sessionId === operationId) return false;
    return true;
  });
  await persistOfflineQueue(filtered);
}

/**
 * Clear entire queue (after successful bulk sync)
 */
export async function clearOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (e) {
    logger.warn('[TRAINING_QUEUE] Failed to clear AsyncStorage queue', e);
  }
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      await replaceTrainingOfflineQueueMirror([]);
    }
  } catch (e) {
    logger.warn('[TRAINING_QUEUE] Failed to clear localData queue mirror', e);
  }
}

/**
 * Get queue size
 */
export async function getQueueSize(): Promise<number> {
  const queue = await loadOfflineQueue();
  return queue.length;
}
