/**
 * Keep the JS runtime warmer while a guided session is active.
 *
 * - expo-keep-awake: prevents the screen from sleeping while the session UI is mounted
 *   (helps when the phone is unlocked / screen-on nearby).
 * - Full Android foreground-service (true Doze immunity with screen off) is still the
 *   stronger pattern; parked until we add a native FGS module. Until then, SET_DONE is
 *   handled via background notification task + durable rest drain (no unlock required).
 */
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { logger } from '@/lib/logger';

const KEEP_AWAKE_TAG = 'reclaim-guided-session';

export async function startGuidedSessionRuntime(sessionId: string): Promise<void> {
  try {
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    if (__DEV__) logger.debug('[guidedSessionRuntime] keep-awake on', { sessionId });
  } catch (e) {
    if (__DEV__) logger.debug('[guidedSessionRuntime] keep-awake failed', e);
  }
}

export function stopGuidedSessionRuntime(): void {
  try {
    deactivateKeepAwake(KEEP_AWAKE_TAG);
    if (__DEV__) logger.debug('[guidedSessionRuntime] keep-awake off');
  } catch (e) {
    if (__DEV__) logger.debug('[guidedSessionRuntime] keep-awake deactivate failed', e);
  }
}
