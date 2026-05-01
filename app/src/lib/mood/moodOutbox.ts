import AsyncStorage from '@react-native-async-storage/async-storage';

import { scheduleMoodPendingMirror } from '@/lib/localData/smallModuleMirrors';

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

export async function loadPendingMoodCheckins(): Promise<PendingMoodCheckinV2[]> {
  try {
    const raw = await AsyncStorage.getItem(MOOD_PENDING_KEY_V2);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as PendingMoodCheckinV2[];
  } catch {
    return [];
  }
}

export async function savePendingMoodCheckins(rows: PendingMoodCheckinV2[]): Promise<void> {
  await AsyncStorage.setItem(MOOD_PENDING_KEY_V2, JSON.stringify(rows));
  scheduleMoodPendingMirror(rows);
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
