// Training Offline Sync - Sync queued operations when network returns
import { logger } from '../logger';
import {
  createTrainingSession,
  updateTrainingSession,
  updateTrainingSessionItem,
  logTrainingSet,
} from '../api';
import { loadOfflineQueue, clearOfflineQueue, dequeueOperation } from './offlineQueue';
import { logTrainingEvent } from '../api';
import type { OfflineOperation } from './offlineQueue';

/**
 * Sync all queued operations to Supabase
 * Returns: { success: number, failed: number, errors: string[] }
 */
export async function syncOfflineQueue(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const queue = await loadOfflineQueue();
  if (queue.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  // Sort by timestamp to maintain order
  const sortedQueue = [...queue].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const operation of sortedQueue) {
    try {
      await syncOperation(operation);
      await dequeueOperation(getOperationId(operation));
      success++;
    } catch (error: any) {
      failed++;
      errors.push(`${operation.type}: ${error.message || 'Unknown error'}`);
      logger.warn('Failed to sync offline operation', { operation: operation.type, error });
    }
  }

  // Log sync result
  if (success > 0 || failed > 0) {
    await logTrainingEvent('training_sync_completed', {
      success,
      failed,
      total: queue.length,
    }).catch(() => {
      // Ignore event logging failures
    });
  }

  return { success, failed, errors };
}

/**
 * Sync a single operation
 */
async function syncOperation(operation: OfflineOperation): Promise<void> {
  switch (operation.type) {
    case 'createSession':
      await createTrainingSession({
        id: operation.id,
        mode: operation.payload.mode,
        goals: operation.payload.goals,
        startedAt: operation.payload.startedAt,
      });
      break;

    case 'upsertItem':
      await updateTrainingSessionItem(operation.itemId, {
        skipped: operation.payload.skipped,
        performed: operation.payload.performed,
      });
      break;

    case 'insertSetLog':
      await logTrainingSet({
        id: operation.id,
        sessionItemId: operation.sessionItemId,
        setIndex: operation.payload.setIndex,
        weight: operation.payload.weight,
        reps: operation.payload.reps,
        rpe: operation.payload.rpe,
      });
      break;

    case 'finalizeSession':
      await updateTrainingSession(operation.sessionId, {
        endedAt: operation.payload.endedAt,
        summary: operation.payload.summary,
      });
      break;

    default:
      throw new Error(`Unknown operation type: ${(operation as any).type}`);
  }
}

/**
 * Get unique ID for an operation (for dequeueing)
 */
function getOperationId(operation: OfflineOperation): string {
  switch (operation.type) {
    case 'createSession':
      return operation.id;
    case 'upsertItem':
      return operation.itemId;
    case 'insertSetLog':
      return operation.id;
    case 'finalizeSession':
      return operation.sessionId;
    default:
      return `${(operation as any).type}_${Date.now()}`;
  }
}

/**
 * Check if network is available (simple check)
 */
export async function isNetworkAvailable(): Promise<boolean> {
  try {
    // Try a lightweight Supabase query
    const { supabase } = await import('../supabase');
    const { error } = await supabase.from('training_sessions').select('id').limit(1);
    // If no error or error is not a network error, assume network is available
    if (!error) return true;
    // PGRST301 = network error, but also check for other network-related errors
    if (error.code === 'PGRST301' || error.message?.includes('network') || error.message?.includes('fetch')) {
      return false;
    }
    // Other errors (like auth) don't mean network is down
    return true;
  } catch (error: any) {
    // If we can't even make the request, assume offline
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return false;
    }
    // Unknown error - assume online to avoid blocking
    return true;
  }
}
