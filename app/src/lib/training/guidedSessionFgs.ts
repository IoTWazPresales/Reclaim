/**
 * Android health foreground service for an open guided training session.
 * The native service keeps the headless loop alive after the activity is destroyed.
 * Start with the session. Stop only on clear, finalize, or stale — not when the session UI unmounts.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import { logger } from '@/lib/logger';
import {
  claimBackgroundActionsOwner,
  getBackgroundActionsOwner,
  isBackgroundActionsOwnedByOther,
  releaseBackgroundActionsOwner,
} from '@/lib/system/backgroundActionsOwner';
import {
  readSessionForegroundSnapshot,
  registerSessionForegroundHandler,
  runSessionForegroundLoop,
  startSessionForeground,
  stopSessionForeground,
} from '@/lib/system/sessionForegroundTransport';

const SLEEP_MS = 5_000;

let activeSessionId: string | null = null;

registerSessionForegroundHandler('guided', async (data) => {
  const sessionId = String(data.sessionId ?? '');
  const delayMs = Number(data.delayMs ?? SLEEP_MS);
  await runSessionForegroundLoop('guided', sessionId, delayMs, async () => {
    const { tickGuidedRestEndTimers } = await import('@/lib/training/guidedRestEndTimer');
    tickGuidedRestEndTimers();
    return false;
  });
});

async function ensureActivityRecognition(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (typeof Platform.Version === 'number' && Platform.Version < 29) return true;
  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    );
    if (granted) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      {
        title: 'Physical activity',
        message:
          'Reclaim needs activity recognition while a guided session is open so training updates can run with the screen off.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    logger.warn('[GUIDED_FGS] ACTIVITY_RECOGNITION request failed', e);
    return false;
  }
}

export function isGuidedSessionFgsRunning(): boolean {
  if (Platform.OS !== 'android') return false;
  return getBackgroundActionsOwner() === 'guided';
}

export function getGuidedSessionFgsSessionId(): string | null {
  return getBackgroundActionsOwner() === 'guided' ? activeSessionId : null;
}

/**
 * Start (or refresh) the guided-session FGS. Same domain and session does not restart the service.
 * No-op on iOS / web.
 */
export async function startGuidedSessionFgs(sessionId: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!sessionId) return false;

  if (isBackgroundActionsOwnedByOther('guided')) {
    logger.warn('[GUIDED_FGS] refused — another domain owns the session service', {
      owner: getBackgroundActionsOwner(),
      sessionId,
    });
    return false;
  }

  const recognitionOk = await ensureActivityRecognition();
  if (!recognitionOk) {
    logger.warn('[GUIDED_FGS] ACTIVITY_RECOGNITION denied — refusing FGS start', { sessionId });
    return false;
  }

  const ok = await startSessionForeground({
    domain: 'guided',
    sessionId,
    taskTitle: 'Reclaim training in progress',
    taskDesc: 'Guided session active — Done on your watch updates this phone.',
    linkingURI: 'reclaim://training',
    delayMs: SLEEP_MS,
    endsAtMs: 0,
  });
  if (!ok) {
    activeSessionId = null;
    releaseBackgroundActionsOwner('guided');
    return false;
  }
  activeSessionId = sessionId;
  claimBackgroundActionsOwner('guided');
  logger.debug('[GUIDED_FGS] started', { sessionId });
  return true;
}

/** Stop FGS if this domain owns it, including after a reload cleared the in-memory owner. */
export async function stopGuidedSessionFgs(reason?: string): Promise<void> {
  try {
    const { cancelAllGuidedRestEndTimers } = await import('@/lib/training/guidedRestEndTimer');
    cancelAllGuidedRestEndTimers(reason ?? 'fgs_stop');
  } catch (e) {
    if (__DEV__) logger.debug('[GUIDED_FGS] cancel rest timers failed', e);
  }
  const jsOwns = getBackgroundActionsOwner() === 'guided';
  const snapshot = await readSessionForegroundSnapshot();
  const nativeOwns = snapshot.running && snapshot.domain === 'guided';
  if (!jsOwns && !nativeOwns) {
    if (activeSessionId) activeSessionId = null;
    return;
  }
  if (Platform.OS !== 'android') {
    activeSessionId = null;
    releaseBackgroundActionsOwner('guided');
    return;
  }
  await stopSessionForeground('guided');
  logger.debug('[GUIDED_FGS] stopped', { reason: reason ?? 'unspecified', wasSessionId: activeSessionId });
  activeSessionId = null;
  releaseBackgroundActionsOwner('guided');
}
