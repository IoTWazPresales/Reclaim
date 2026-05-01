/**
 * Sleep domain repository. Thin delegator to lib/api and lib/sleepSettings.
 */

import { logger } from '@/lib/logger';
import * as api from '@/lib/api';
import * as sleepSettings from '@/lib/sleepSettings';

export type { SleepSession, SleepPrefs, SleepCandidate } from '@/lib/api';
export type { SleepSettings, WakeDetection } from '@/lib/sleepSettings';

export async function loadSleepSettings() {
  logger.debug('[REPO_SEAM] SleepRepository.loadSleepSettings');
  return sleepSettings.loadSleepSettings();
}

export async function saveSleepSettings(next: Partial<sleepSettings.SleepSettings>) {
  logger.debug('[REPO_SEAM] SleepRepository.saveSleepSettings');
  return sleepSettings.saveSleepSettings(next);
}

export async function listWakeDetections() {
  logger.debug('[REPO_SEAM] SleepRepository.listWakeDetections');
  return sleepSettings.listWakeDetections();
}

export async function addWakeDetection(det: sleepSettings.WakeDetection) {
  logger.debug('[REPO_SEAM] SleepRepository.addWakeDetection');
  return sleepSettings.addWakeDetection(det);
}

export async function listSleepSessions(days = 14) {
  logger.debug('[REPO_SEAM] SleepRepository.listSleepSessions');
  return api.listSleepSessions(days);
}

export async function getSleepPrefs() {
  logger.debug('[REPO_SEAM] SleepRepository.getSleepPrefs');
  return api.getSleepPrefs();
}

export async function upsertSleepPrefs(prefs: Partial<api.SleepPrefs>) {
  logger.debug('[REPO_SEAM] SleepRepository.upsertSleepPrefs');
  return api.upsertSleepPrefs(prefs);
}

export async function addSleepSession(input: Parameters<typeof api.addSleepSession>[0]) {
  logger.debug('[REPO_SEAM] SleepRepository.addSleepSession');
  return api.addSleepSession(input);
}

export async function listSleepCandidates(limit = 3) {
  logger.debug('[REPO_SEAM] SleepRepository.listSleepCandidates');
  return api.listSleepCandidates(limit);
}
