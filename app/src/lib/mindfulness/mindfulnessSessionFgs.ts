/**
 * Android health foreground service for an in-progress mindfulness session.
 * Shares the one session foreground service with guided training and meditation.
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

const SLEEP_MS = 4_000;

let activeSessionId: string | null = null;

registerSessionForegroundHandler('mindfulness', async (data) => {
  const sessionId = String(data.sessionId ?? '');
  const endsAtMs = Number(data.endsAtMs ?? 0);
  const delayMs = Number(data.delayMs ?? SLEEP_MS);
  await runSessionForegroundLoop('mindfulness', sessionId, delayMs, async () => {
    if (Date.now() < endsAtMs) return false;
    const { completeMindfulnessSessionFromRuntime } = await import(
      '@/lib/notifications/mindfulnessNotificationActions'
    );
    await completeMindfulnessSessionFromRuntime('fgs_timer');
    return true;
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
          'Reclaim needs activity recognition while a mindfulness session runs with the screen off.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    logger.warn('[MINDFUL_FGS] ACTIVITY_RECOGNITION request failed', e);
    return false;
  }
}

export function isMindfulnessSessionFgsRunning(): boolean {
  return Platform.OS === 'android' && getBackgroundActionsOwner() === 'mindfulness';
}

export function getMindfulnessSessionFgsSessionId(): string | null {
  return getBackgroundActionsOwner() === 'mindfulness' ? activeSessionId : null;
}

export async function startMindfulnessSessionFgs(
  sessionId: string,
  durationSec: number,
): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!sessionId) return false;

  if (isBackgroundActionsOwnedByOther('mindfulness')) {
    logger.warn('[MINDFUL_FGS] refused — another domain owns the session service', {
      owner: getBackgroundActionsOwner(),
      sessionId,
    });
    return false;
  }

  const recognitionOk = await ensureActivityRecognition();
  if (!recognitionOk) {
    logger.warn('[MINDFUL_FGS] ACTIVITY_RECOGNITION denied — refusing FGS start', { sessionId });
    return false;
  }

  const endsAtMs = Date.now() + Math.max(30, durationSec) * 1000;
  const ok = await startSessionForeground({
    domain: 'mindfulness',
    sessionId,
    taskTitle: 'Reclaim mindfulness in progress',
    taskDesc: 'Session started — Done when you are ready.',
    linkingURI: 'reclaim://mindfulness',
    delayMs: SLEEP_MS,
    endsAtMs,
  });
  if (!ok) {
    activeSessionId = null;
    releaseBackgroundActionsOwner('mindfulness');
    return false;
  }
  activeSessionId = sessionId;
  claimBackgroundActionsOwner('mindfulness');
  logger.debug('[MINDFUL_FGS] started', { sessionId, durationSec });
  return true;
}

export async function stopMindfulnessSessionFgs(reason?: string): Promise<void> {
  const jsOwns = getBackgroundActionsOwner() === 'mindfulness';
  const snapshot = await readSessionForegroundSnapshot();
  const nativeOwns = snapshot.running && snapshot.domain === 'mindfulness';
  if (!jsOwns && !nativeOwns) {
    activeSessionId = null;
    return;
  }
  if (Platform.OS !== 'android') {
    activeSessionId = null;
    releaseBackgroundActionsOwner('mindfulness');
    return;
  }
  await stopSessionForeground('mindfulness');
  logger.debug('[MINDFUL_FGS] stopped', { reason: reason ?? 'unspecified' });
  activeSessionId = null;
  releaseBackgroundActionsOwner('mindfulness');
}
