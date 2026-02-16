/**
 * Repository for insights/mood data. Thin seam delegating to lib/api.
 */

import { listMood as apiListMood, type MoodEntry } from '@/lib/api';
import { logger } from '@/lib/logger';

export async function listMood(limit = 100): Promise<MoodEntry[]> {
  logger.debug('[REPO_SEAM] InsightsRepository.listMood', { limit });
  return apiListMood(limit);
}
