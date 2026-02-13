/**
 * Meditation domain repository. Thin delegator to lib/api.
 */

import { logger } from '@/lib/logger';
import * as api from '@/lib/api';

export type { MeditationSession } from '@/lib/api';

export async function listMeditations() {
  logger.debug('[REPO_SEAM] MeditationRepository.listMeditations');
  return api.listMeditations();
}

export async function deleteMeditation(id: string) {
  logger.debug('[REPO_SEAM] MeditationRepository.deleteMeditation');
  return api.deleteMeditation(id);
}

export async function upsertMeditation(session: Parameters<typeof api.upsertMeditation>[0]) {
  logger.debug('[REPO_SEAM] MeditationRepository.upsertMeditation');
  return api.upsertMeditation(session);
}

export function finishMeditation(session: Parameters<typeof api.finishMeditation>[0]) {
  logger.debug('[REPO_SEAM] MeditationRepository.finishMeditation');
  return api.finishMeditation(session);
}

export function createMeditationStart(note?: string, meditationType?: import('@/lib/meditations').MeditationType) {
  logger.debug('[REPO_SEAM] MeditationRepository.createMeditationStart');
  return api.createMeditationStart(note, meditationType);
}
