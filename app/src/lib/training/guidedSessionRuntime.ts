/**
 * Keep the JS runtime alive while a guided session is active.
 *
 * - expo-keep-awake: UI-mounted only (screen-on helper). Safe to stop on view unmount.
 * - Android FGS (guidedSessionFgs): lives for the *open session*, not the Training UI.
 *   Start on session start / view mount; stop only on session clear / finalize / stale cleanup.
 *   Never stop FGS solely because the user minimized the session screen.
 */
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { logger } from '@/lib/logger';
import { startGuidedSessionFgs, stopGuidedSessionFgs } from '@/lib/training/guidedSessionFgs';

const KEEP_AWAKE_TAG = 'reclaim-guided-session';

function stopKeepAwakeOnly(): void {
  try {
    deactivateKeepAwake(KEEP_AWAKE_TAG);
    if (__DEV__) logger.debug('[guidedSessionRuntime] keep-awake off');
  } catch (e) {
    if (__DEV__) logger.debug('[guidedSessionRuntime] keep-awake deactivate failed', e);
  }
}

/**
 * Start keep-awake (if UI path) + ensure FGS is running for this sessionId.
 */
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

/**
 * Stop keep-awake only. Does NOT stop FGS — session may still be open after UI dismiss.
 */
export function stopGuidedSessionRuntime(): void {
  stopKeepAwakeOnly();
}

/**
 * Full teardown: keep-awake + FGS. Use when the guided session is ending.
 */
export async function stopGuidedSessionRuntimeAsync(reason?: string): Promise<void> {
  stopKeepAwakeOnly();
  await stopGuidedSessionFgs(reason ?? 'runtime_stop_async');
}
