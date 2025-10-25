import { Platform } from 'react-native';
import { getHealthKitSleep } from './providers/appleHealth';
import { getGoogleFitSleep } from './providers/googleFit';
import { getHealthConnectSleep } from './providers/healthConnect';

export type SleepWindow = { start: Date; end: Date; source: 'healthkit'|'googlefit'|'health_connect' };

export async function importLatestSleep(): Promise<SleepWindow | null> {
  if (Platform.OS === 'ios') return await getHealthKitSleep();
  const hc = await getHealthConnectSleep();
  if (hc) return hc;
  return await getGoogleFitSleep();
}
