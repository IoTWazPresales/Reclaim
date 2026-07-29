/**
 * Durable active mindfulness session (lock-screen Start / Done).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InterventionKey } from '@/lib/mindfulness';
import { logger } from '@/lib/logger';

const KEY = 'reclaim:mindfulness_active_session_v1';

export type MindfulnessActiveSession = {
  sessionId: string;
  intervention: InterventionKey | 'breath_478';
  startedAt: string;
  /** Planned duration for FGS auto-complete. */
  durationSec: number;
  source: 'notification' | 'ui';
};

export function durationSecForIntervention(intervention: string): number {
  switch (intervention) {
    case 'box_breath_60':
      return 60;
    case 'breath_478':
      return 90;
    case 'five_senses':
    case 'reality_check':
    case 'urge_surf':
      return 120;
    default:
      return 90;
  }
}

export async function loadMindfulnessActiveSession(): Promise<MindfulnessActiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MindfulnessActiveSession;
    if (!parsed?.sessionId || !parsed?.startedAt) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch (e) {
    logger.warn('[mindfulnessSession] load failed', e);
    return null;
  }
}

export async function saveMindfulnessActiveSession(session: MindfulnessActiveSession): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearMindfulnessActiveSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* non-blocking */
  }
}
