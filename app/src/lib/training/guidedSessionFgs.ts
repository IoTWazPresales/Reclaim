/**
 * Real Android Foreground Service for an open guided training session.
 *
 * Replaces the Expo sticky TRAINING_SESSION_ACTIVE patch. Keeps the process
 * foreground-eligible so Wear/lock notification actions can run without unlocking.
 *
 * Type: health (Android best practice for fitness / exercise trackers) +
 * ACTIVITY_RECOGNITION runtime prerequisite.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import { logger } from '@/lib/logger';

const TASK_NAME = 'ReclaimGuidedTraining';
const SLEEP_MS = 5_000;

let activeSessionId: string | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Long-running FGS task — idle loop while isRunning(). */
async function guidedSessionFgsTask(_args: { sessionId: string; delay: number }): Promise<void> {
  const delay = Math.max(1_000, _args?.delay ?? SLEEP_MS);
  while (BackgroundService.isRunning()) {
    await sleep(delay);
  }
}

async function ensureActivityRecognition(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 29) return true;
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
  try {
    return BackgroundService.isRunning();
  } catch {
    return false;
  }
}

export function getGuidedSessionFgsSessionId(): string | null {
  return activeSessionId;
}

/**
 * Start (or refresh) the guided-session FGS. Idempotent per sessionId.
 * No-op on iOS / web.
 */
export async function startGuidedSessionFgs(sessionId: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!sessionId) return false;

  const recognitionOk = await ensureActivityRecognition();
  if (!recognitionOk) {
    logger.warn('[GUIDED_FGS] ACTIVITY_RECOGNITION denied — FGS may be rejected by OS');
  }

  try {
    if (BackgroundService.isRunning()) {
      if (activeSessionId === sessionId) {
        logger.debug('[GUIDED_FGS] already running', { sessionId });
        return true;
      }
      await BackgroundService.stop();
      activeSessionId = null;
    }

    await BackgroundService.start(guidedSessionFgsTask, {
      taskName: TASK_NAME,
      taskTitle: 'Reclaim training in progress',
      taskDesc: 'Guided session active — Done on your watch updates this phone.',
      taskIcon: { name: 'ic_launcher', type: 'mipmap' },
      color: '#0b1220',
      linkingURI: 'reclaim://training',
      parameters: { sessionId, delay: SLEEP_MS },
      foregroundServiceType: ['health'],
    });
    activeSessionId = sessionId;
    logger.debug('[GUIDED_FGS] started', { sessionId, running: BackgroundService.isRunning() });
    return BackgroundService.isRunning();
  } catch (e) {
    activeSessionId = null;
    logger.warn('[GUIDED_FGS] start failed', e);
    return false;
  }
}

/** Stop FGS if running. Safe to call repeatedly. */
export async function stopGuidedSessionFgs(reason?: string): Promise<void> {
  if (Platform.OS !== 'android') {
    activeSessionId = null;
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
  }
}
