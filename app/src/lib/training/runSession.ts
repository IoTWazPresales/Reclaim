import { logger } from '@/lib/logger';
import { setIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import { startGuidedSessionFgs } from '@/lib/training/guidedSessionFgs';
import { runCueIntentKey, runStartCue } from '@/lib/training/runCue';
import { ensureFineLocationForRun, readNativeRunFix } from '@/lib/training/runLocationPermission';
import { appendRunFix, finishRunSession, openRunSession, saveRunHome } from '@/lib/training/runRouteRepository';
import type { RunFix } from '@/lib/training/runPrivacy';

export async function beginRunSession(trainingSessionId: string): Promise<void> {
  const locationOk = await ensureFineLocationForRun();
  if (!locationOk) {
    logger.warn('[RUN] fine location denied — route will not be recorded', { trainingSessionId });
  }
  try {
    await openRunSession(trainingSessionId, new Date().toISOString());
  } catch (e) {
    logger.warn('[RUN] could not open the route session', e);
  }
  const cue = runStartCue();
  await setIntent(runCueIntentKey(trainingSessionId), {
    type: 'TRAINING_RUN',
    sessionId: trainingSessionId,
    title: cue.title,
    body: cue.body,
    issuedAt: new Date().toISOString(),
  });
  await reconcileNotifications();
  await startGuidedSessionFgs(trainingSessionId, { needsLocation: locationOk });
}

export async function recordRunFix(trainingSessionId: string): Promise<void> {
  const native = await readNativeRunFix();
  if (!native || native.latitude == null || native.longitude == null) return;
  const fix: RunFix = {
    recordedAt: new Date(native.recordedAtMs ?? Date.now()).toISOString(),
    latitude: native.latitude,
    longitude: native.longitude,
    accuracyM: native.accuracyM,
  };
  try {
    await appendRunFix(trainingSessionId, fix);
  } catch (e) {
    if (__DEV__) logger.debug('[RUN] fix was not stored', e);
  }
}

/** Save the latest phone fix as the home privacy point. Does not write it onto the route. */
export async function saveCurrentFixAsRunHome(trainingSessionId: string): Promise<boolean> {
  const native = await readNativeRunFix();
  if (!native || native.latitude == null || native.longitude == null) return false;
  await saveRunHome({ latitude: native.latitude, longitude: native.longitude });
  logger.debug('[RUN] home privacy point saved', { trainingSessionId });
  return true;
}

export async function loadFinishedRunRoute(trainingSessionId: string, endedAt: string): Promise<RunFix[]> {
  try {
    return await finishRunSession(trainingSessionId, endedAt);
  } catch (e) {
    logger.warn('[RUN] route finish failed', e);
    return [];
  }
}
