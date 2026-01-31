/**
 * Repository for training/meditation data. Thin seam delegating to lib/api.
 */

import { listMeditations as apiListMeditations } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { MeditationSession } from '@/lib/api';

export async function listMeditations(): Promise<MeditationSession[]> {
  logger.debug('[REPO_SEAM] TrainingRepository.listMeditations');
  return apiListMeditations();
}
