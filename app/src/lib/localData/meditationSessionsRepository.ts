/**
 * Canonical meditation session list in localData (`reclaim_async_blob_mirror` domain `meditation_sessions`).
 * AsyncStorage `@reclaim/meditations/v1` is legacy compatibility + migration source.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ASYNC_MIRROR_DOMAIN,
  isValidMeditationSessions,
  loadBlobMirrorForUser,
  replaceBlobMirror,
} from '@/lib/localData/smallModuleMirrors';
import { logger } from '@/lib/logger';

/** Keep in sync with `api.ts` MEDITATION_KEY */
export const MEDITATION_LEGACY_ASYNC_STORAGE_KEY = '@reclaim/meditations/v1';

export type MeditationSessionRow = {
  id: string;
  startTime: string;
  endTime?: string;
  durationSec?: number;
  note?: string;
  meditationType?: string;
};

function dedupeMeditationsById<T extends { id: string }>(rows: T[]): T[] {
  const m = new Map<string, T>();
  for (const r of rows) {
    if (r?.id && !m.has(r.id)) m.set(r.id, r);
  }
  return [...m.values()];
}

function tryParseMeditationsLegacy(raw: string | null): MeditationSessionRow[] | null {
  if (raw === null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    if (parsed.length === 0) return [];
    if (!isValidMeditationSessions(parsed)) return null;
    return parsed as MeditationSessionRow[];
  } catch {
    return null;
  }
}

export async function loadMeditationSessionsForUser(userId: string): Promise<MeditationSessionRow[] | null> {
  const blob = await loadBlobMirrorForUser(ASYNC_MIRROR_DOMAIN.meditationSessions, userId);
  if (blob === null) return null;
  if (!isValidMeditationSessions(blob)) return null;
  return dedupeMeditationsById(blob as MeditationSessionRow[]);
}

export async function saveMeditationSessionsForUser(
  userId: string,
  rows: MeditationSessionRow[],
): Promise<void> {
  await replaceBlobMirror(ASYNC_MIRROR_DOMAIN.meditationSessions, userId, rows);
}

/** Idempotent: if SQLite has no row, promote legacy AsyncStorage list into canonical store. */
export async function tryMigrateMeditationsFromAsyncStorage(userId: string): Promise<MeditationSessionRow[] | null> {
  const raw = await AsyncStorage.getItem(MEDITATION_LEGACY_ASYNC_STORAGE_KEY);
  const fromAs = tryParseMeditationsLegacy(raw);
  if (fromAs === null) return null;

  await saveMeditationSessionsForUser(userId, fromAs);
  logger.info('[meditation] Migrated legacy AsyncStorage to localData (canonical meditation sessions)');
  return fromAs;
}
