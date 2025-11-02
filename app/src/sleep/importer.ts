import { getUnifiedHealthService } from '@/lib/health';

export type SleepWindow = { start: Date; end: Date; source: 'healthkit'|'googlefit' };

/**
 * Import latest sleep session using unified health service
 * Uses Apple HealthKit on iOS, Google Fit on Android
 */
export async function importLatestSleep(): Promise<SleepWindow | null> {
  const healthService = getUnifiedHealthService();
  const session = await healthService.getLatestSleepSession();
  
  if (!session) return null;
  
  // Map platform to source type for database
  const sourceMap: Record<string, 'healthkit'|'googlefit'> = {
    'apple_healthkit': 'healthkit',
    'google_fit': 'googlefit',
  };
  
  const source = sourceMap[session.source] || 'healthkit';
  
  return {
    start: session.startTime,
    end: session.endTime,
    source,
  };
}
