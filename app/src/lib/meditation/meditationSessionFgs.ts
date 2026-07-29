/**
 * Android FGS for lock-screen meditation Start (session runtime without unlock).
 * Voice/script UI attaches when the app opens; timer + Done work locked.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import { logger } from '@/lib/logger';
import {
  claimBackgroundActionsOwner,
  getBackgroundActionsOwner,
  isBackgroundActionsOwnedByOther,
  releaseBackgroundActionsOwner,
} from '@/lib/system/backgroundActionsOwner';

const TASK_NAME = 'ReclaimMeditation';
const SLEEP_MS = 5_000;
const DEFAULT_DURATION_SEC = 300;

let activeSessionId: string | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function meditationFgsTask(args: {
  sessionId: string;
  endsAtMs: number;
  delay: number;
}): Promise<void> {
  const delay = Math.max(1_000, args?.delay ?? SLEEP_MS);
  while (BackgroundService.isRunning()) {
    try {
      if (Date.now() >= (args.endsAtMs ?? 0)) {
        const { completeMeditationSessionFromRuntime } = await import(
          '@/lib/notifications/meditationNotificationActions'
        );
        await completeMeditationSessionFromRuntime('fgs_timer');
        break;
      }
    } catch {
      /* non-blocking */
    }
    await sleep(delay);
  }
}

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

async function startWithIcon(
  sessionId: string,
  endsAtMs: number,
  taskIcon: { name: string; type: string },
): Promise<void> {
  await BackgroundService.start(meditationFgsTask, {
    taskName: TASK_NAME,
    taskTitle: 'Reclaim meditation in progress',
    taskDesc: 'Session started — open the app for voice, or tap Done when finished.',
    taskIcon,
    color: '#0b1220',
    linkingURI: 'reclaim://meditation',
    parameters: { sessionId, endsAtMs, delay: SLEEP_MS },
    foregroundServiceType: ['health'],
  });
}

export async function startMeditationSessionFgs(
  sessionId: string,
  durationSec: number = DEFAULT_DURATION_SEC,
): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!sessionId) return false;

  if (isBackgroundActionsOwnedByOther('meditation')) {
    logger.warn('[MEDITATION_FGS] refused — another domain owns BackgroundService', {
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

  try {
    if (BackgroundService.isRunning()) {
      if (activeSessionId === sessionId && getBackgroundActionsOwner() === 'meditation') {
        return true;
      }
      await BackgroundService.stop();
      activeSessionId = null;
      releaseBackgroundActionsOwner('meditation');
    }

    try {
      await startWithIcon(sessionId, endsAtMs, { name: 'ic_launcher', type: 'mipmap' });
    } catch {
      await startWithIcon(sessionId, endsAtMs, { name: 'ic_launcher_foreground', type: 'mipmap' });
    }

    activeSessionId = sessionId;
    claimBackgroundActionsOwner('meditation');
    logger.debug('[MEDITATION_FGS] started', { sessionId, durationSec });
    return BackgroundService.isRunning();
  } catch (e) {
    activeSessionId = null;
    releaseBackgroundActionsOwner('meditation');
    logger.warn('[MEDITATION_FGS] start failed', e);
    return false;
  }
}

export async function stopMeditationSessionFgs(reason?: string): Promise<void> {
  if (getBackgroundActionsOwner() !== 'meditation') {
    activeSessionId = null;
    return;
  }
  if (Platform.OS !== 'android') {
    activeSessionId = null;
    releaseBackgroundActionsOwner('meditation');
    return;
  }
  try {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
      logger.debug('[MEDITATION_FGS] stopped', { reason: reason ?? 'unspecified' });
    }
  } catch (e) {
    logger.warn('[MEDITATION_FGS] stop failed', e);
  } finally {
    activeSessionId = null;
    releaseBackgroundActionsOwner('meditation');
  }
}
