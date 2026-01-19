// Training Offline Queue - Handle session logging when network is unavailable
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import { safeSerialize } from '../logger';

const QUEUE_KEY = '@reclaim/training/offline_queue';

export type OfflineOperation =
  | {
      type: 'createSession';
      id: string;
      payload: {
        mode: 'timed' | 'manual';
        goals: Record<string, number>;
        startedAt: string;
      };
      timestamp: string;
    }
  | {
      type: 'upsertItem';
      sessionId: string;
      itemId: string;
      payload: {
        skipped?: boolean;
        performed?: any;
      };
      timestamp: string;
    }
  | {
      type: 'insertSetLog';
      sessionItemId: string;
      id: string;
      payload: {
        setIndex: number;
        weight: number;
        reps: number;
        rpe?: number;
      };
      timestamp: string;
    }
  | {
      type: 'finalizeSession';
      sessionId: string;
      payload: {
        endedAt: string;
        summary: any;
      };
      timestamp: string;
    };

/**
 * Load offline queue from storage
 */
export async function loadOfflineQueue(): Promise<OfflineOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.warn('Failed to load offline queue', error);
    return [];
  }
}

/**
 * Save offline queue to storage
 */
export async function saveOfflineQueue(queue: OfflineOperation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    logger.warn('Failed to save offline queue', error);
  }
}

/**
 * Add operation to offline queue
 */
export async function enqueueOperation(operation: OfflineOperation): Promise<void> {
  const queue = await loadOfflineQueue();
  queue.push(operation);
  await saveOfflineQueue(queue);
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
  await saveOfflineQueue(filtered);
}

/**
 * Clear entire queue (after successful bulk sync)
 */
export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Get queue size
 */
export async function getQueueSize(): Promise<number> {
  const queue = await loadOfflineQueue();
  return queue.length;
}
