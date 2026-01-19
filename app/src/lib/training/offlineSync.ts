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
      const result = await syncOperation(operation);
      if (result === 'blocked') {
        continue;
      }
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
type SyncResult = 'success' | 'blocked';

function isUniqueViolation(err: any): boolean {
  if (!err) return false;
  if (err?.code === '23505') return true;
  const message = `${err?.message || ''} ${err?.details || ''}`;
  return /duplicate key value|unique constraint|already exists/i.test(message);
}

async function precheckExistsById(
  operation: OfflineOperation,
  table: string,
  idColumn: string,
  idValue: string,
): Promise<'exists' | 'not_found' | 'blocked'> {
  try {
    const { supabase } = await import('../supabase');
    const { data, error } = await supabase
      .from(table)
      .select(idColumn)
      .eq(idColumn, idValue)
      .maybeSingle();

    if (error) {
      logger.warn('[OFFSYNC_IDEMP] precheck blocked', {
        opId: getOperationId(operation),
        opType: operation.type,
        errorCode: error.code,
        errorMessage: error.message,
      });
      return 'blocked';
    }

    if (data && (data as any)[idColumn]) {
      return 'exists';
    }
    return 'not_found';
  } catch (error: any) {
    logger.warn('[OFFSYNC_IDEMP] precheck blocked', {
      opId: getOperationId(operation),
      opType: operation.type,
      errorCode: error?.code,
      errorMessage: error?.message,
    });
    return 'blocked';
  }
}

async function syncOperation(operation: OfflineOperation): Promise<SyncResult> {
  switch (operation.type) {
    case 'createSession':
      {
        const precheck = await precheckExistsById(
          operation,
          'training_sessions',
          'id',
          operation.id,
        );
        if (precheck === 'exists') return 'success';
        if (precheck === 'blocked') return 'blocked';
        try {
          await createTrainingSession({
            id: operation.id,
            mode: operation.payload.mode,
            goals: operation.payload.goals,
            startedAt: operation.payload.startedAt,
          });
        } catch (error: any) {
          if (isUniqueViolation(error)) {
            logger.warn('[OFFSYNC_IDEMP] duplicate createSession treated as success', {
              opId: operation.id,
              opType: operation.type,
              errorCode: error?.code,
              errorMessage: error?.message,
            });
            return 'success';
          }
          throw error;
        }
      }
      return 'success';

    case 'upsertItem':
      await updateTrainingSessionItem(operation.itemId, {
        skipped: operation.payload.skipped,
        performed: operation.payload.performed,
      });
      return 'success';

    case 'insertSetLog':
      {
        const precheck = await precheckExistsById(
          operation,
          'training_set_logs',
          'id',
          operation.id,
        );
        if (precheck === 'exists') return 'success';
        if (precheck === 'blocked') return 'blocked';
        try {
          await logTrainingSet({
            id: operation.id,
            sessionItemId: operation.sessionItemId,
            setIndex: operation.payload.setIndex,
            weight: operation.payload.weight,
            reps: operation.payload.reps,
            rpe: operation.payload.rpe,
          });
        } catch (error: any) {
          if (isUniqueViolation(error)) {
            logger.warn('[OFFSYNC_IDEMP] duplicate insertSetLog treated as success', {
              opId: operation.id,
              opType: operation.type,
              errorCode: error?.code,
              errorMessage: error?.message,
            });
            return 'success';
          }
          throw error;
        }
      }
      return 'success';

    case 'finalizeSession':
      await updateTrainingSession(operation.sessionId, {
        endedAt: operation.payload.endedAt,
        summary: operation.payload.summary,
      });
      return 'success';

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
