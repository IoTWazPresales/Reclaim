/**
 * Android health foreground service for lock-screen meditation Start.
 * Voice and script UI attach when the app opens. Timer and Done work while locked.
 * Shares the one session foreground service with guided training and mindfulness.
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
const DEFAULT_DURATION_SEC = 300;

let activeSessionId: string | null = null;

registerSessionForegroundHandler('meditation', async (data) => {
  const sessionId = String(data.sessionId ?? '');
  const endsAtMs = Number(data.endsAtMs ?? 0);
  const delayMs = Number(data.delayMs ?? SLEEP_MS);
  await runSessionForegroundLoop('meditation', sessionId, delayMs, async () => {
    if (Date.now() < endsAtMs) return false;
    const { completeMeditationSessionFromRuntime } = await import(
      '@/lib/notifications/meditationNotificationActions'
    );
    await completeMeditationSessionFromRuntime('fgs_timer');
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
          'Reclaim needs activity recognition while a meditation session runs with the screen off.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    logger.warn('[MEDITATION_FGS] ACTIVITY_RECOGNITION request failed', e);
    return false;
  }
}

export function getMeditationDefaultDurationSec(): number {
  return DEFAULT_DURATION_SEC;
}

export async function startMeditationSessionFgs(
  sessionId: string,
  durationSec: number = DEFAULT_DURATION_SEC,
): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!sessionId) return false;

  if (isBackgroundActionsOwnedByOther('meditation')) {
    logger.warn('[MEDITATION_FGS] refused — another domain owns the session service', {
      owner: getBackgroundActionsOwner(),
      sessionId,
    });
    return false;
  }

  const recognitionOk = await ensureActivityRecognition();
  if (!recognitionOk) {
    logger.warn('[MEDITATION_FGS] ACTIVITY_RECOGNITION denied', { sessionId });
    return false;
  }

  const endsAtMs = Date.now() + Math.max(60, durationSec) * 1000;
  const ok = await startSessionForeground({
    domain: 'meditation',
    sessionId,
    taskTitle: 'Reclaim meditation in progress',
    taskDesc: 'Session started — open the app for voice, or tap Done when finished.',
    linkingURI: 'reclaim://meditation',
    delayMs: SLEEP_MS,
    endsAtMs,
  });
  if (!ok) {
    activeSessionId = null;
    releaseBackgroundActionsOwner('meditation');
    return false;
  }
  activeSessionId = sessionId;
  claimBackgroundActionsOwner('meditation');
  logger.debug('[MEDITATION_FGS] started', { sessionId, durationSec });
  return true;
}

export async function stopMeditationSessionFgs(reason?: string): Promise<void> {
  const jsOwns = getBackgroundActionsOwner() === 'meditation';
  const snapshot = await readSessionForegroundSnapshot();
  const nativeOwns = snapshot.running && snapshot.domain === 'meditation';
  if (!jsOwns && !nativeOwns) {
    activeSessionId = null;
    return;
  }
  if (Platform.OS !== 'android') {
    activeSessionId = null;
    releaseBackgroundActionsOwner('meditation');
    return;
  }
  await stopSessionForeground('meditation');
  logger.debug('[MEDITATION_FGS] stopped', { reason: reason ?? 'unspecified' });
  activeSessionId = null;
  releaseBackgroundActionsOwner('meditation');
}
