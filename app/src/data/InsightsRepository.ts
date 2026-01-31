/**
 * Repository for insights/mood data. Thin seam delegating to lib/api.
 */

import { listMood as apiListMood } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { MoodEntry } from '@/lib/api';

export async function listMood(limit = 100): Promise<MoodEntry[]> {
  logger.debug('[REPO_SEAM] InsightsRepository.listMood', { limit });
  return apiListMood(limit);
}
