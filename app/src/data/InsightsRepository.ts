/**
 * Repository for insights/mood data. Thin seam delegating to lib/api.
 */

import { listCanonicalMoodEntriesForDays, type MoodEntry } from '@/lib/api';
import { logger } from '@/lib/logger';

export async function listMood(limit = 100): Promise<MoodEntry[]> {
  logger.debug('[REPO_SEAM] InsightsRepository.listMood', { limit });
  const rows = await listCanonicalMoodEntriesForDays(400);
  return rows.slice(0, limit);
}
