/**
 * Real Android Foreground Service for an open guided training session.
 *
 * Replaces the Expo sticky TRAINING_SESSION_ACTIVE patch. Keeps the process
 * foreground-eligible so Wear/lock notification actions can run without unlocking.
 *
 * Type: health (Android best practice for fitness / exercise trackers) +
 * ACTIVITY_RECOGNITION runtime prerequisite.
 *
 * Lifecycle: start with session open; stop only on session clear/finalize/stale —
 * not when TrainingSessionView unmounts.
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

const TASK_NAME = 'ReclaimGuidedTraining';
const SLEEP_MS = 5_000;

let activeSessionId: string | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Long-running FGS task — idle loop while isRunning(); ticks rest-end deadlines. */
async function guidedSessionFgsTask(_args: { sessionId: string; delay: number }): Promise<void> {
  const delay = Math.max(1_000, _args?.delay ?? SLEEP_MS);
  while (BackgroundService.isRunning()) {
    try {
      const { tickGuidedRestEndTimers } = await import('@/lib/training/guidedRestEndTimer');
      tickGuidedRestEndTimers();
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

async function startWithIcon(
  sessionId: string,
  taskIcon: { name: string; type: string },
): Promise<void> {
  await BackgroundService.start(guidedSessionFgsTask, {
    taskName: TASK_NAME,
    taskTitle: 'Reclaim training in progress',
    taskDesc: 'Guided session active — Done on your watch updates this phone.',
    taskIcon,
    color: '#0b1220',
    linkingURI: 'reclaim://training',
    parameters: { sessionId, delay: SLEEP_MS },
    foregroundServiceType: ['health'],
  });
}

/**
 * Start (or refresh) the guided-session FGS. Idempotent per sessionId.
 * No-op on iOS / web.
 */
export async function startGuidedSessionFgs(sessionId: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!sessionId) return false;

  if (isBackgroundActionsOwnedByOther('guided')) {
    logger.warn('[GUIDED_FGS] refused — another domain owns BackgroundService', {
      owner: getBackgroundActionsOwner(),
      sessionId,
    });
    return false;
  }

  const recognitionOk = await ensureActivityRecognition();
  if (!recognitionOk) {
    // health FGS on API 34+ typically requires this — do not start a doomed service.
    logger.warn('[GUIDED_FGS] ACTIVITY_RECOGNITION denied — refusing FGS start', { sessionId });
    return false;
  }

  try {
    if (BackgroundService.isRunning()) {
      if (activeSessionId === sessionId && getBackgroundActionsOwner() === 'guided') {
        logger.debug('[GUIDED_FGS] already running', { sessionId });
        return true;
      }
      await BackgroundService.stop();
      activeSessionId = null;
      releaseBackgroundActionsOwner('guided');
    }

    try {
      await startWithIcon(sessionId, { name: 'ic_launcher', type: 'mipmap' });
    } catch (iconErr) {
      logger.warn('[GUIDED_FGS] ic_launcher start failed — retrying adaptive icon name', iconErr);
      await startWithIcon(sessionId, { name: 'ic_launcher_foreground', type: 'mipmap' });
    }

    activeSessionId = sessionId;
    claimBackgroundActionsOwner('guided');
    logger.debug('[GUIDED_FGS] started', { sessionId, running: BackgroundService.isRunning() });
    return BackgroundService.isRunning();
  } catch (e) {
    activeSessionId = null;
    releaseBackgroundActionsOwner('guided');
    logger.warn('[GUIDED_FGS] start failed', e);
    return false;
  }
}

/** Stop FGS if running. Safe to call repeatedly. */
export async function stopGuidedSessionFgs(reason?: string): Promise<void> {
  try {
    const { cancelAllGuidedRestEndTimers } = await import('@/lib/training/guidedRestEndTimer');
    cancelAllGuidedRestEndTimers(reason ?? 'fgs_stop');
  } catch {
    /* best-effort */
  }
  if (getBackgroundActionsOwner() !== 'guided') {
    // Do not stop mindfulness/meditation FGS from a guided teardown path.
    if (activeSessionId) activeSessionId = null;
    return;
  }
  if (Platform.OS !== 'android') {
    activeSessionId = null;
    releaseBackgroundActionsOwner('guided');
    return;
  }
  try {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
      logger.debug('[GUIDED_FGS] stopped', { reason: reason ?? 'unspecified', wasSessionId: activeSessionId });
    }
  } catch (e) {
    logger.warn('[GUIDED_FGS] stop failed', e);
  } finally {
    activeSessionId = null;
    releaseBackgroundActionsOwner('guided');
  }
}
