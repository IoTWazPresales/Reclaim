import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isValidPendingMoodRow,
  loadMoodPendingMirrorForUser,
  replaceMoodPendingMirror,
} from '@/lib/localData/smallModuleMirrors';
import { initializeLocalDatabase } from '@/lib/localData/database';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

export const MOOD_LEGACY_KEY_V1 = '@reclaim/mood/v1';
export const MOOD_PENDING_KEY_V2 = '@reclaim/mood/v2/pendingCheckins';
export const MOOD_LEGACY_IMPORT_STATE_KEY_V2 = '@reclaim/mood/v2/legacyImportState';

export type MoodLegacyImportStateV2 = {
  version: 1;
  /** Legacy `MOOD_KEY` row ids that have been imported into the pending/sync path (idempotent guard). */
  importedLegacyIds: string[];
};

export type PendingMoodCheckinV2 = {
  localId: string;
  rating: number;
  ts: string;
  day_date: string;
  note: string | null;
  tags: string[] | null;
  energy: number | null;
  source: string;
  enqueuedAt: string;
  retryCount: number;
  lastAttemptAt?: string;
  kind: 'user' | 'legacy_import';
};

const defaultImportState = (): MoodLegacyImportStateV2 => ({
  version: 1,
  importedLegacyIds: [],
});

export async function loadMoodLegacyImportState(): Promise<MoodLegacyImportStateV2> {
  try {
    const raw = await AsyncStorage.getItem(MOOD_LEGACY_IMPORT_STATE_KEY_V2);
    if (!raw) return defaultImportState();
    const parsed = JSON.parse(raw) as MoodLegacyImportStateV2;
    if (parsed?.version !== 1 || !Array.isArray(parsed.importedLegacyIds)) return defaultImportState();
    return { version: 1, importedLegacyIds: [...parsed.importedLegacyIds] };
  } catch {
    return defaultImportState();
  }
}

export async function saveMoodLegacyImportState(state: MoodLegacyImportStateV2): Promise<void> {
  await AsyncStorage.setItem(MOOD_LEGACY_IMPORT_STATE_KEY_V2, JSON.stringify(state));
}

function parsePendingMoodCheckinsFromAsyncStorage(raw: string | null): PendingMoodCheckinV2[] | null {
  if (raw === null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    if (parsed.length === 0) return [];
    const rows = parsed.filter(Boolean) as PendingMoodCheckinV2[];
    if (!rows.every((r) => isValidPendingMoodRow(r))) return null;
    return rows;
  } catch {
    return null;
  }
}

async function alignLegacyPendingMoodAsyncStorage(rows: PendingMoodCheckinV2[]): Promise<void> {
  const raw = await AsyncStorage.getItem(MOOD_PENDING_KEY_V2);
  if (raw === JSON.stringify(rows)) return;
  await AsyncStorage.setItem(MOOD_PENDING_KEY_V2, JSON.stringify(rows));
}

export async function loadPendingMoodCheckins(): Promise<PendingMoodCheckinV2[]> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      const init = await initializeLocalDatabase();
      if (init.ok) {
        const fromDb = await loadMoodPendingMirrorForUser(uid);
        const raw = await AsyncStorage.getItem(MOOD_PENDING_KEY_V2);
        const fromAs = parsePendingMoodCheckinsFromAsyncStorage(raw);

        if (fromDb.length > 0) {
          await alignLegacyPendingMoodAsyncStorage(fromDb);
          return fromDb;
        }

        if (fromAs !== null) {
          if (fromAs.length > 0) {
            await replaceMoodPendingMirror(fromAs);
            await AsyncStorage.setItem(MOOD_PENDING_KEY_V2, JSON.stringify(fromAs));
            logger.info('[moodOutbox] Migrated legacy AsyncStorage pending mood rows to localData', {
              count: fromAs.length,
            });
            return fromAs;
          }
          await alignLegacyPendingMoodAsyncStorage([]);
          return [];
        }
      }
    }
  } catch (e) {
    logger.warn('[moodOutbox] canonical mood pending read failed', { error: (e as Error)?.message });
  }

  const raw = await AsyncStorage.getItem(MOOD_PENDING_KEY_V2);
  const fromAsOnly = parsePendingMoodCheckinsFromAsyncStorage(raw);
  if (fromAsOnly !== null) return fromAsOnly;

  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return [];
    const restored = await loadMoodPendingMirrorForUser(uid);
    if (restored.length === 0) return [];
    logger.info('[moodOutbox] Restored pending mood check-ins from SQLite (fallback path)', {
      count: restored.length,
    });
    await savePendingMoodCheckins(restored);
    return restored;
  } catch (e) {
    logger.warn('[moodOutbox] SQLite mood pending restore failed', { error: (e as Error)?.message });
    return [];
  }
}

export async function savePendingMoodCheckins(rows: PendingMoodCheckinV2[]): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      await replaceMoodPendingMirror(rows);
    }
  } catch (e) {
    logger.warn('[moodOutbox] localData pending mood save failed; AsyncStorage still updated', {
      error: (e as Error)?.message,
    });
  }
  await AsyncStorage.setItem(MOOD_PENDING_KEY_V2, JSON.stringify(rows));
}

export async function appendPendingMoodCheckin(entry: PendingMoodCheckinV2): Promise<void> {
  const cur = await loadPendingMoodCheckins();
  if (cur.some((e) => e.localId === entry.localId)) {
    const merged = cur.map((e) => (e.localId === entry.localId ? entry : e));
    await savePendingMoodCheckins(merged);
    return;
  }
  cur.push(entry);
  await savePendingMoodCheckins(cur);
}

export async function removePendingMoodCheckinByLocalId(localId: string): Promise<void> {
  const cur = await loadPendingMoodCheckins();
  const next = cur.filter((e) => e.localId !== localId);
  if (next.length !== cur.length) await savePendingMoodCheckins(next);
}
