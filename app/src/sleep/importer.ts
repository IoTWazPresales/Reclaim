import { googleFitGetLatestSleepSession } from '@/lib/health/googleFitService';

export type SleepWindow = { start: Date; end: Date; source: 'healthkit'|'googlefit' };

/**
 * Import latest sleep session using unified health service
 * Uses Apple HealthKit on iOS, Google Fit on Android
 */
export async function importLatestSleep(): Promise<SleepWindow | null> {
  const session = await googleFitGetLatestSleepSession();
  
  if (!session) return null;
  
  // Map platform to source type for database
  const sourceMap: Record<string, 'healthkit'|'googlefit'> = {
    'apple_healthkit': 'healthkit',
    'google_fit': 'googlefit',
  };
  
  const source = sourceMap[session.source] || 'googlefit';
  
  return {
    start: session.startTime,
    end: session.endTime,
    source,
  };
}
