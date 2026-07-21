/**
 * Keep the JS runtime alive while a guided session is active.
 *
 * - expo-keep-awake: screen-on / UI-mounted helper only.
 * - Android FGS (guidedSessionFgs): real foreground service — process stays
 *   eligible for Wear/lock notification actions with the screen off.
 *   Replaces the removed Expo sticky TRAINING_SESSION_ACTIVE patch.
 */
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { logger } from '@/lib/logger';
import { startGuidedSessionFgs, stopGuidedSessionFgs } from '@/lib/training/guidedSessionFgs';

const KEEP_AWAKE_TAG = 'reclaim-guided-session';

export async function startGuidedSessionRuntime(sessionId: string): Promise<void> {
  try {
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    if (__DEV__) logger.debug('[guidedSessionRuntime] keep-awake on', { sessionId });
  } catch (e) {
    if (__DEV__) logger.debug('[guidedSessionRuntime] keep-awake failed', e);
  }

  if (Platform.OS === 'android') {
    const ok = await startGuidedSessionFgs(sessionId);
    if (!ok) {
      logger.warn('[guidedSessionRuntime] FGS did not start — Wear Done may wait until phone opens', {
        sessionId,
      });
    }
  }
}

export function stopGuidedSessionRuntime(): void {
  try {
    deactivateKeepAwake(KEEP_AWAKE_TAG);
    if (__DEV__) logger.debug('[guidedSessionRuntime] keep-awake off');
  } catch (e) {
    if (__DEV__) logger.debug('[guidedSessionRuntime] keep-awake deactivate failed', e);
  }

  // Fire-and-forget stop; finalize paths also call stopGuidedSessionFgs explicitly.
  void stopGuidedSessionFgs('runtime_stop');
}

/** Awaitable stop for session finalize / clear paths. */
export async function stopGuidedSessionRuntimeAsync(reason?: string): Promise<void> {
  try {
    deactivateKeepAwake(KEEP_AWAKE_TAG);
  } catch {
    /* non-blocking */
  }
  await stopGuidedSessionFgs(reason ?? 'runtime_stop_async');
}
