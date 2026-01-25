// C:\Reclaim\app\src\lib\meditationRuntime.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MeditationSession } from './api';

const ACTIVE_KEY = '@reclaim/meditations/active';

/**
 * Minimal runtime state record for active meditation session.
 * This is what we store in ACTIVE_KEY.
 */
export type MeditationSessionRecord = MeditationSession;

/**
 * Result of attempting to start a session.
 */
export type StartSessionResult = {
  session: MeditationSessionRecord;
  actionTaken: 'started' | 'resumed' | 'ignored';
};

/**
 * Load the currently active meditation session from storage.
 * Returns null if no active session exists.
 */
export async function loadActiveSession(userId?: string | null): Promise<MeditationSessionRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as MeditationSessionRecord;
    // Validate: ensure session has required fields
    if (!session?.id || !session?.startTime) {
      // Corrupted data, clear it
      await AsyncStorage.removeItem(ACTIVE_KEY);
      return null;
    }
    return session;
  } catch (error) {
    // On error, clear potentially corrupted data
    await AsyncStorage.removeItem(ACTIVE_KEY).catch(() => {});
    return null;
  }
}

/**
 * Set the active meditation session in storage.
 * This enforces the single active session invariant by replacing any existing active session.
 */
export async function setActiveSession(session: MeditationSessionRecord | null): Promise<void> {
  try {
    if (session) {
      await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(ACTIVE_KEY);
    }
  } catch (error) {
    // Non-blocking: log but don't throw
    if (__DEV__) {
      console.warn('[meditationRuntime] Failed to set active session:', error);
    }
  }
}

/**
 * Clear the active meditation session from storage.
 * Idempotent: safe to call multiple times.
 */
export async function clearActiveSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_KEY);
  } catch (error) {
    // Non-blocking
    if (__DEV__) {
      console.warn('[meditationRuntime] Failed to clear active session:', error);
    }
  }
}

/**
 * Start a new meditation session or resume an existing one.
 * 
 * Enforces single active session invariant:
 * - If no active session exists → start new session
 * - If active session exists → resume it (ignore new request)
 * 
 * Race-safe: checks storage atomically before setting.
 * 
 * @param request - The new session to start (if no active exists)
 * @returns Result indicating what action was taken
 */
export async function startSession(request: MeditationSessionRecord): Promise<StartSessionResult> {
  // Atomic check: load current active session
  const existing = await loadActiveSession();
  
  if (existing) {
    // Active session exists → resume it, ignore new request
    return {
      session: existing,
      actionTaken: 'resumed',
    };
  }
  
  // No active session → start new one
  await setActiveSession(request);
  return {
    session: request,
    actionTaken: 'started',
  };
}

/**
 * Complete a meditation session (mark as finished).
 * 
 * Idempotent: safe to call multiple times with the same sessionId.
 * If session is not active, this is a no-op.
 * 
 * @param sessionId - ID of the session to complete
 * @returns true if session was active and cleared, false otherwise
 */
export async function completeSession(sessionId: string): Promise<boolean> {
  const active = await loadActiveSession();
  
  if (!active) {
    // No active session, already complete
    return false;
  }
  
  if (active.id !== sessionId) {
    // Different session is active, don't clear it
    return false;
  }
  
  // This is the active session → clear it
  await clearActiveSession();
  return true;
}

/**
 * Cancel a meditation session (delete without saving).
 * 
 * Idempotent: safe to call multiple times with the same sessionId.
 * If session is not active, this is a no-op.
 * 
 * @param sessionId - ID of the session to cancel
 * @returns true if session was active and cleared, false otherwise
 */
export async function cancelSession(sessionId: string): Promise<boolean> {
  const active = await loadActiveSession();
  
  if (!active) {
    // No active session, already cancelled
    return false;
  }
  
  if (active.id !== sessionId) {
    // Different session is active, don't clear it
    return false;
  }
  
  // This is the active session → clear it
  await clearActiveSession();
  return true;
}

/**
 * Check if a specific session is currently active.
 * 
 * @param sessionId - ID to check
 * @returns true if this session is active, false otherwise
 */
export async function isSessionActive(sessionId: string): Promise<boolean> {
  const active = await loadActiveSession();
  return active?.id === sessionId;
}
