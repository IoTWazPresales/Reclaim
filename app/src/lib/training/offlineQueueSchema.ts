/**
 * Training offline queue operation shapes + JSON validation.
 * Kept free of Expo/SQLite imports so Vitest can cover validation without loading `expo-sqlite`.
 */

type RetryMeta = {
  retryCount?: number;
  lastAttemptAt?: string;
};

export type OfflineOperation = RetryMeta & (
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
    }
);

export function isValidOfflineQueuePayload(arr: unknown): arr is OfflineOperation[] {
  if (!Array.isArray(arr)) return false;
  for (const op of arr) {
    if (!op || typeof op !== 'object') return false;
    const o = op as Record<string, unknown>;
    if (typeof o.timestamp !== 'string') return false;
    if (o.retryCount !== undefined && typeof o.retryCount !== 'number') return false;
    if (o.lastAttemptAt !== undefined && typeof o.lastAttemptAt !== 'string') return false;
    const t = o.type;
    if (t === 'createSession') {
      if (typeof o.id !== 'string') return false;
      const p = o.payload;
      if (!p || typeof p !== 'object') return false;
      const pl = p as Record<string, unknown>;
      if (pl.mode !== 'timed' && pl.mode !== 'manual') return false;
      if (!pl.goals || typeof pl.goals !== 'object') return false;
      if (typeof pl.startedAt !== 'string') return false;
      continue;
    }
    if (t === 'upsertItem') {
      if (typeof o.sessionId !== 'string' || typeof o.itemId !== 'string') return false;
      const p = o.payload;
      if (!p || typeof p !== 'object') return false;
      continue;
    }
    if (t === 'insertSetLog') {
      if (typeof o.sessionItemId !== 'string' || typeof o.id !== 'string') return false;
      const p = o.payload;
      if (!p || typeof p !== 'object') return false;
      const pl = p as Record<string, unknown>;
      if (typeof pl.setIndex !== 'number') return false;
      if (typeof pl.weight !== 'number') return false;
      if (typeof pl.reps !== 'number') return false;
      continue;
    }
    if (t === 'finalizeSession') {
      if (typeof o.sessionId !== 'string') return false;
      const p = o.payload;
      if (!p || typeof p !== 'object') return false;
      const pl = p as Record<string, unknown>;
      if (typeof pl.endedAt !== 'string') return false;
      continue;
    }
    return false;
  }
  return true;
}
