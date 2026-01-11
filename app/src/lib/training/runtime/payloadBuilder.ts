/**
 * Payload Builder for Training Runtime
 * 
 * Converts runtime state to Supabase-compatible insert payloads.
 * Ensures DB itemIds (TEXT) are used, not synthetic runtime itemIds.
 */

import type { SetLogEntry, ExerciseRuntimeState } from '../types';

/**
 * Build set log insert payload for Supabase
 * Uses actual DB itemId (TEXT), not runtime's synthetic itemId
 */
export function buildSetLogPayload(
  dbItemId: string, // Actual DB training_session_items.id (TEXT)
  dbSessionId: string, // Actual DB training_sessions.id (TEXT)
  exerciseId: string,
  setIndex: number,
  weight: number,
  reps: number,
  rpe: number | null | undefined,
  completedAt: string,
): {
  id: string; // Set log ID (TEXT)
  sessionItemId: string; // DB itemId (TEXT)
  sessionId: string; // DB sessionId (TEXT)
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  rpe: number | null;
  completedAt: string;
  timestamp: string;
} {
  // Generate deterministic set log ID from actual DB itemId
  const setLogId = `${dbItemId}_set_${setIndex}_${Date.now()}`;
  
  return {
    id: setLogId,
    sessionItemId: dbItemId, // CRITICAL: Use actual DB itemId, not runtime's synthetic itemId
    sessionId: dbSessionId, // CRITICAL: Use actual DB sessionId
    exerciseId,
    setIndex,
    weight,
    reps,
    rpe: rpe ?? null,
    completedAt,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build offline queue payload for set log (same structure as online insert)
 */
export function buildSetLogQueuePayload(
  dbItemId: string,
  exerciseId: string,
  setIndex: number,
  weight: number,
  reps: number,
  rpe: number | null | undefined,
): {
  type: 'insertSetLog';
  sessionItemId: string; // DB itemId (TEXT)
  id: string; // Set log ID (TEXT)
  payload: {
    setIndex: number;
    weight: number;
    reps: number;
    rpe?: number;
  };
  timestamp: string;
} {
  const setLogId = `${dbItemId}_set_${setIndex}_${Date.now()}`;
  
  return {
    type: 'insertSetLog',
    sessionItemId: dbItemId, // CRITICAL: Use actual DB itemId
    id: setLogId,
    payload: {
      setIndex,
      weight,
      reps,
      ...(rpe !== null && rpe !== undefined ? { rpe } : {}), // Only include rpe if it's a number
    },
    timestamp: new Date().toISOString(),
  };
}
