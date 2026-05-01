/**
 * Mood domain repository. Thin delegator to lib/api.
 */

import { logger } from '@/lib/logger';
import * as api from '@/lib/api';

export type { MoodEntry, MoodCheckin } from '@/lib/api';

export async function listDailyMoodFromCheckins(days: number) {
  logger.debug('[REPO_SEAM] MoodRepository.listDailyMoodFromCheckins');
  return api.listDailyMoodFromCheckins(days);
}

export async function listMood(limit = 100) {
  logger.debug('[REPO_SEAM] MoodRepository.listMood');
  return api.listMood(limit);
}

export async function listMoodCheckins(limit = 30) {
  logger.debug('[REPO_SEAM] MoodRepository.listMoodCheckins');
  return api.listMoodCheckins(limit);
}

export async function listMoodCheckinsRange(startISO: string, endISO: string) {
  logger.debug('[REPO_SEAM] MoodRepository.listMoodCheckinsRange');
  return api.listMoodCheckinsRange(startISO, endISO);
}

export async function listMoodCheckinsDays(days: number) {
  logger.debug('[REPO_SEAM] MoodRepository.listMoodCheckinsDays');
  return api.listMoodCheckinsDays(days);
}

export async function createMoodCheckin(input: Parameters<typeof api.createMoodCheckin>[0]) {
  logger.debug('[REPO_SEAM] MoodRepository.createMoodCheckin');
  return api.createMoodCheckin(input);
}

export async function addMoodCheckin(input: api.UpsertMoodInput) {
  logger.debug('[REPO_SEAM] MoodRepository.addMoodCheckin');
  return api.addMoodCheckin(input);
}

export async function deleteMoodCheckin(id: string) {
  logger.debug('[REPO_SEAM] MoodRepository.deleteMoodCheckin');
  return api.deleteMoodCheckin(id);
}
