/**
 * Android FGS for an in-progress mindfulness session (lock-screen Start without unlock).
 * Shares BackgroundService with guided — refuses if guided owns it.
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

const TASK_NAME = 'ReclaimMindfulness';
const SLEEP_MS = 4_000;

let activeSessionId: string | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mindfulnessFgsTask(args: {
  sessionId: string;
  endsAtMs: number;
  delay: number;
}): Promise<void> {
  const delay = Math.max(1_000, args?.delay ?? SLEEP_MS);
  while (BackgroundService.isRunning()) {
    try {
      if (Date.now() >= (args.endsAtMs ?? 0)) {
        const { completeMindfulnessSessionFromRuntime } = await import(
          '@/lib/notifications/mindfulnessNotificationActions'
        );
        await completeMindfulnessSessionFromRuntime('fgs_timer');
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

async function startWithIcon(
  sessionId: string,
  endsAtMs: number,
  taskIcon: { name: string; type: string },
): Promise<void> {
  await BackgroundService.start(mindfulnessFgsTask, {
    taskName: TASK_NAME,
    taskTitle: 'Reclaim mindfulness in progress',
    taskDesc: 'Session started — Done when you are ready.',
    taskIcon,
    color: '#0b1220',
    linkingURI: 'reclaim://mindfulness',
    parameters: { sessionId, endsAtMs, delay: SLEEP_MS },
    foregroundServiceType: ['health'],
  });
}

export async function startMindfulnessSessionFgs(
  sessionId: string,
  durationSec: number,
): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!sessionId) return false;

  if (isBackgroundActionsOwnedByOther('mindfulness')) {
    logger.warn('[MINDFUL_FGS] refused — another domain owns BackgroundService', {
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

  try {
    if (BackgroundService.isRunning()) {
      if (activeSessionId === sessionId && getBackgroundActionsOwner() === 'mindfulness') {
        return true;
      }
      await BackgroundService.stop();
      activeSessionId = null;
      releaseBackgroundActionsOwner('mindfulness');
    }

    try {
      await startWithIcon(sessionId, endsAtMs, { name: 'ic_launcher', type: 'mipmap' });
    } catch {
      await startWithIcon(sessionId, endsAtMs, { name: 'ic_launcher_foreground', type: 'mipmap' });
    }

    activeSessionId = sessionId;
    claimBackgroundActionsOwner('mindfulness');
    logger.debug('[MINDFUL_FGS] started', { sessionId, durationSec });
    return BackgroundService.isRunning();
  } catch (e) {
    activeSessionId = null;
    releaseBackgroundActionsOwner('mindfulness');
    logger.warn('[MINDFUL_FGS] start failed', e);
    return false;
  }
}

export async function stopMindfulnessSessionFgs(reason?: string): Promise<void> {
  if (getBackgroundActionsOwner() !== 'mindfulness') {
    activeSessionId = null;
    return;
  }
  if (Platform.OS !== 'android') {
    activeSessionId = null;
    releaseBackgroundActionsOwner('mindfulness');
    return;
  }
  try {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
      logger.debug('[MINDFUL_FGS] stopped', { reason: reason ?? 'unspecified' });
    }
  } catch (e) {
    logger.warn('[MINDFUL_FGS] stop failed', e);
  } finally {
    activeSessionId = null;
    releaseBackgroundActionsOwner('mindfulness');
  }
}
