import { NativeModules, Platform } from 'react-native';
import type { SleepSession } from '@/lib/health/types';

const { SamsungHealthModule } = NativeModules;

export type SamsungSleepSession = SleepSession & {
  metadata?: { sleepType?: number; timeOffset?: number };
};

function normalizeSessions(raw: any[]): SamsungSleepSession[] {
  return (raw ?? []).map((item) => ({
    startTime: new Date(item.startTime),
    endTime: new Date(item.endTime),
    durationMinutes: typeof item.durationMinutes === 'number' ? item.durationMinutes : undefined,
    stages: Array.isArray(item.stages) ? item.stages : [],
    source: 'samsung_health',
    metadata: item.metadata ?? undefined,
    efficiency: undefined,
  }));
}

export async function samsungIsAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!SamsungHealthModule?.isAvailable) return false;
  try {
    return await SamsungHealthModule.isAvailable();
  } catch {
    return false;
  }
}

export async function samsungRequestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!SamsungHealthModule?.requestPermissions) return false;
  return SamsungHealthModule.requestPermissions();
}

export async function samsungReadSleep(from: Date, to: Date): Promise<SamsungSleepSession[]> {
  if (Platform.OS !== 'android') return [];
  if (!SamsungHealthModule?.readSleep) return [];
  const raw = await SamsungHealthModule.readSleep(from.getTime(), to.getTime());
  return normalizeSessions(raw);
}

