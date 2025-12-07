import type { ActivitySample, HealthMetric, HeartRateSample, SleepSession, StressLevel } from './types';
import { GoogleFitProvider } from './providers/googleFit';

const DEFAULT_METRICS: HealthMetric[] = [
  'heart_rate',
  'resting_heart_rate',
  'heart_rate_variability',
  'sleep_analysis',
  'sleep_stages',
  'stress_level',
  'steps',
  'active_energy',
  'activity_level',
];

let googleFitInstance: GoogleFitProvider | null = null;

export function getGoogleFitProvider(): GoogleFitProvider {
  if (!googleFitInstance) {
    googleFitInstance = new GoogleFitProvider();
  }
  return googleFitInstance;
}

export async function googleFitRequestPermissions(metrics: HealthMetric[] = DEFAULT_METRICS): Promise<boolean> {
  const provider = getGoogleFitProvider();
  return provider.requestPermissions(metrics);
}

export async function googleFitHasPermissions(metrics: HealthMetric[] = DEFAULT_METRICS): Promise<boolean> {
  const provider = getGoogleFitProvider();
  if (typeof provider.hasPermissions === 'function') {
    return provider.hasPermissions(metrics);
  }
  return false;
}

export async function googleFitGetLatestSleepSession(): Promise<SleepSession | null> {
  const provider = getGoogleFitProvider();
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sessions = await provider.getSleepSessions(start, now);
  if (!sessions.length) return null;
  return sessions.sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0];
}

export async function googleFitGetSleepSessions(days = 30): Promise<SleepSession[]> {
  const provider = getGoogleFitProvider();
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return provider.getSleepSessions(start, now);
}

export async function googleFitGetTodayActivity(): Promise<ActivitySample | null> {
  const provider = getGoogleFitProvider();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const samples = await provider.getActivity(start, now);
  return samples.length ? samples[samples.length - 1] : null;
}

export function googleFitSubscribeHeartRate(callback: (sample: HeartRateSample) => void): () => void {
  const provider = getGoogleFitProvider();
  return provider.subscribeToHeartRate(callback);
}

export function googleFitSubscribeStress(callback: (level: StressLevel) => void): () => void {
  const provider = getGoogleFitProvider();
  return provider.subscribeToStressLevel(callback);
}

