/**
 * Phase 1 canonical mood: device-first durable pending outbox + Supabase as synced history.
 * Legacy `@reclaim/mood/v1` is import-only (see runLegacyMoodImportOnce).
 *
 * Insights: merged list includes pending entries so MoodScreen and insights agree pre-sync;
 * values are user-authored and may not yet exist server-side.
 */
import { supabase } from '@/lib/supabase';
import {
  getCurrentUser,
  getLocalDayDate,
  parseTags,
  type MoodCheckin,
  type MoodEntry,
  type UpsertMoodInput,
} from '@/lib/api';
import {
  appendPendingMoodCheckin,
  loadMoodLegacyImportState,
  loadPendingMoodCheckins,
  MOOD_LEGACY_KEY_V1,
  removePendingMoodCheckinByLocalId,
  saveMoodLegacyImportState,
  savePendingMoodCheckins,
  type PendingMoodCheckinV2,
} from '@/lib/mood/moodOutbox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { invalidateMoodAndInsightQueries } from '@/lib/mood/moodQueryInvalidation';
import { queryClient } from '@/lib/queryClient';

function mapRowToMoodCheckin(row: Record<string, unknown>, userId: string): MoodCheckin {
  const r = row as any;
  const created_at =
    (r.created_at as string) ||
    (r.ts as string) ||
    (typeof r.day_date === 'string' ? `${r.day_date}T12:00:00.000Z` : new Date().toISOString());
  const moodVal =
    typeof r.mood === 'number' ? r.mood : typeof r.rating === 'number' ? r.rating : 0;
  return {
    id: (r.id as string) ?? '',
    user_id: (r.user_id as string) ?? userId,
    created_at,
    mood: moodVal,
    energy: (r.energy as number | null | undefined) ?? null,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : null,
    note: (r.note as string | null | undefined) ?? null,
    ctx: (r.ctx as Record<string, unknown> | null | undefined) ?? null,
  };
}

function moodCheckinSortTime(row: Record<string, unknown>): number {
  const r = row as any;
  const iso =
    r.ts ??
    r.created_at ??
    (typeof r.day_date === 'string' && r.day_date.trim() ? `${r.day_date}T12:00:00.000Z` : null);
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function isUniqueViolation(err: unknown): boolean {
  if (!err) return false;
  if ((err as any)?.code === '23505') return true;
  const message = `${(err as any)?.message || ''} ${(err as any)?.details || ''}`;
  return /duplicate key value|unique constraint|already exists/i.test(message);
}

/** One-time import from legacy MOOD_KEY into pending outbox (does not delete legacy storage). */
export async function runLegacyMoodImportOnce(): Promise<void> {
  const state = await loadMoodLegacyImportState();
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(MOOD_LEGACY_KEY_V1);
  } catch {
    return;
  }
  if (!raw) return;

  let legacy: MoodEntry[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    legacy = parsed as MoodEntry[];
  } catch {
    return;
  }

  const imported = new Set(state.importedLegacyIds);
  const pending = await loadPendingMoodCheckins();
  const byLocal = new Map(pending.map((p) => [p.localId, p] as const));

  let changedPending = false;
  let changedState = false;

  for (const entry of legacy) {
    if (!entry?.id) continue;
    if (imported.has(entry.id)) continue;
    if (byLocal.has(entry.id)) {
      imported.add(entry.id);
      changedState = true;
      continue;
    }
    const ts = entry.created_at;
    const tsDate = new Date(ts);
    const day_date = entry.day_date ?? getLocalDayDate(tsDate);
    const row: PendingMoodCheckinV2 = {
      localId: entry.id,
      rating: entry.rating,
      ts,
      day_date,
      note: entry.note ?? null,
      tags: Array.isArray(entry.tags) ? entry.tags : null,
      energy: null,
      source: 'legacy_import',
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
      kind: 'legacy_import',
    };
    pending.push(row);
    byLocal.set(entry.id, row);
    imported.add(entry.id);
    changedPending = true;
    changedState = true;
  }

  if (changedPending) await savePendingMoodCheckins(pending);
  if (changedState) await saveMoodLegacyImportState({ version: 1, importedLegacyIds: [...imported] });
}

async function bestEffortMoodEntriesMirror(userId: string, row: Record<string, unknown>): Promise<void> {
  const r = row as any;
  const rating = typeof r.rating === 'number' ? r.rating : r.mood;
  const created = (r.ts ?? r.created_at) as string;
  try {
    await supabase.from('mood_entries').upsert(
      {
        id: r.id,
        user_id: userId,
        rating,
        note: r.note ?? null,
        created_at: created,
      },
      { onConflict: 'id' },
    );
  } catch {
    // non-critical
  }
}

export async function pushPendingMoodRowToSupabase(entry: PendingMoodCheckinV2): Promise<'synced' | 'failed'> {
  const user = await getCurrentUser();
  if (!user) return 'failed';

  const row = {
    id: entry.localId,
    user_id: user.id,
    ts: entry.ts,
    day_date: entry.day_date,
    rating: entry.rating,
    note: entry.note,
    tags: entry.tags?.length ? entry.tags : null,
    energy: entry.energy,
    source: entry.source,
  };

  try {
    const { data, error } = await supabase
      .from('mood_checkins')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();
    if (!error && data) {
      await removePendingMoodCheckinByLocalId(entry.localId);
      await bestEffortMoodEntriesMirror(user.id, data as Record<string, unknown>);
      return 'synced';
    }
    if (error && isUniqueViolation(error)) {
      await removePendingMoodCheckinByLocalId(entry.localId);
      return 'synced';
    }
    return 'failed';
  } catch (e) {
    if (isUniqueViolation(e)) {
      await removePendingMoodCheckinByLocalId(entry.localId);
      return 'synced';
    }
    return 'failed';
  }
}

/** Used by `syncAll` — replays pending mood rows to Supabase (idempotent insert / upsert conflict). */
export async function replayAllPendingMoodCheckinsForSync(): Promise<number> {
  await runLegacyMoodImportOnce();
  const pending = await loadPendingMoodCheckins();
  if (!pending.length) return 0;
  let synced = 0;
  const remaining: PendingMoodCheckinV2[] = [];

  for (const p of pending) {
    const next = { ...p, lastAttemptAt: new Date().toISOString(), retryCount: p.retryCount + 1 };
    const result = await pushPendingMoodRowToSupabase(next);
    if (result === 'synced') synced += 1;
    else remaining.push(next);
  }

  await savePendingMoodCheckins(remaining);
  if (synced > 0) {
    await invalidateMoodAndInsightQueries(queryClient);
  }
  return synced;
}

function pendingToMoodCheckin(p: PendingMoodCheckinV2, userId: string): MoodCheckin {
  return {
    id: p.localId,
    user_id: userId,
    created_at: p.ts,
    mood: p.rating,
    energy: p.energy,
    tags: p.tags,
    note: p.note,
    ctx: null,
  };
}

async function fetchServerMoodCheckinsRaw(userId: string, fetchLimit: number): Promise<MoodCheckin[]> {
  const lim = Math.min(400, Math.max(fetchLimit * 8, 80));
  const { data, error } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('user_id', userId)
    .limit(lim);
  if (error) return [];
  const sorted = [...(data ?? [])].sort((a, b) => moodCheckinSortTime(b) - moodCheckinSortTime(a));
  return sorted.map((row) => mapRowToMoodCheckin(row as Record<string, unknown>, userId));
}

/**
 * Canonical merged mood check-ins for insights + internal consumers.
 * Includes Supabase history plus pending outbox (offline-first).
 */
export async function getCanonicalMoodCheckinsMerged(limit: number): Promise<MoodCheckin[]> {
  await runLegacyMoodImportOnce();
  const user = await getCurrentUser();
  if (!user) return [];

  const [server, pending] = await Promise.all([fetchServerMoodCheckinsRaw(user.id, limit), loadPendingMoodCheckins()]);

  const serverIds = new Set(server.map((s) => s.id));
  const extra = pending
    .filter((p) => !serverIds.has(p.localId))
    .map((p) => pendingToMoodCheckin(p, user.id));

  const merged = [...server, ...extra].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return merged.slice(0, limit);
}

export async function getCanonicalMoodEntriesForDays(days: number): Promise<MoodEntry[]> {
  const pendingIds = new Set((await loadPendingMoodCheckins()).map((p) => p.localId));
  const merged = await getCanonicalMoodCheckinsMerged(Math.max(days * 4, 120));
  const user = await getCurrentUser();
  if (!user) return [];

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const since = getLocalDayDate(start);

  const filtered = merged.filter((m) => {
    const day = getLocalDayDate(new Date(m.created_at));
    return day >= since;
  });

  const byDay = new Map<string, MoodCheckin>();
  for (const row of filtered) {
    const day = getLocalDayDate(new Date(row.created_at));
    if (!byDay.has(day)) byDay.set(day, row);
  }

  return Array.from(byDay.values()).map((row) => ({
    id: row.id,
    rating: row.mood,
    note: row.note ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : undefined,
    created_at: row.created_at,
    day_date: getLocalDayDate(new Date(row.created_at)),
    _syncPending: pendingIds.has(row.id) ? true : undefined,
  }));
}

/** Same shape as `listMoodCheckinsDays` for MoodScreen correlation block. */
export async function getCanonicalMoodCheckinsRange(startISO: string, endISO: string): Promise<MoodCheckin[]> {
  await runLegacyMoodImportOnce();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('ts', startISO)
    .lte('ts', endISO)
    .order('ts', { ascending: true });

  if (error) return [];

  const server = (data ?? []).map((row) => mapRowToMoodCheckin(row as Record<string, unknown>, user.id));
  const pending = await loadPendingMoodCheckins();
  const serverIds = new Set(server.map((s) => s.id));
  const extra = pending
    .filter((p) => p.ts >= startISO && p.ts <= endISO && !serverIds.has(p.localId))
    .map((p) => pendingToMoodCheckin(p, user.id));

  return [...server, ...extra].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export async function getCanonicalMoodCheckinsDaysEntries(days: number): Promise<MoodEntry[]> {
  await runLegacyMoodImportOnce();
  const user = await getCurrentUser();
  if (!user) return [];

  const pendingIds = new Set((await loadPendingMoodCheckins()).map((p) => p.localId));

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const since = getLocalDayDate(start);

  const merged = await getCanonicalMoodCheckinsMerged(400);
  return merged
    .filter((row) => {
      const d = getLocalDayDate(new Date(row.created_at));
      return d >= since;
    })
    .map((row) => ({
      id: row.id,
      rating: row.mood,
      note: row.note ?? undefined,
      created_at: row.created_at,
      tags: Array.isArray(row.tags) ? row.tags : undefined,
      day_date: getLocalDayDate(new Date(row.created_at)),
      _syncPending: pendingIds.has(row.id) ? true : undefined,
    }))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

export type CreateMoodCheckinInput = {
  rating: number;
  note?: string;
  tags?: string[];
  ts?: Date;
  source?: string;
};

export async function submitCreateMoodCheckinDeviceFirst(input: CreateMoodCheckinInput): Promise<MoodCheckin> {
  await runLegacyMoodImportOnce();
  const user = await getCurrentUser();
  if (!user) throw new Error('No signed-in user');

  const ts = input.ts ?? new Date();
  const day_date = getLocalDayDate(ts);
  const tags = parseTags(input.note ?? '', input.tags);
  const localId =
    (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const pending: PendingMoodCheckinV2 = {
    localId,
    rating: input.rating,
    ts: ts.toISOString(),
    day_date,
    note: input.note?.trim() ? input.note.trim() : null,
    tags: tags.length ? tags : null,
    energy: null,
    source: input.source ?? 'manual',
    enqueuedAt: new Date().toISOString(),
    retryCount: 0,
    kind: 'user',
  };

  await appendPendingMoodCheckin(pending);

  const attempt: PendingMoodCheckinV2 = {
    ...pending,
    retryCount: 1,
    lastAttemptAt: new Date().toISOString(),
  };
  const pushed = await pushPendingMoodRowToSupabase(attempt);
  if (pushed === 'synced') {
    const { data } = await supabase.from('mood_checkins').select('*').eq('id', localId).maybeSingle();
    if (data) {
      await invalidateMoodAndInsightQueries(queryClient);
      return mapRowToMoodCheckin(data as Record<string, unknown>, user.id);
    }
  }

  await invalidateMoodAndInsightQueries(queryClient);
  return pendingToMoodCheckin(pending, user.id);
}

export async function submitAddMoodCheckinDeviceFirst(input: UpsertMoodInput): Promise<MoodCheckin> {
  await runLegacyMoodImportOnce();
  const user = await getCurrentUser();
  if (!user) throw new Error('No signed-in user');

  const createdAt = input.created_at ?? new Date().toISOString();
  const tsDate = new Date(createdAt);
  const day_date = getLocalDayDate(tsDate);
  const localId =
    (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const pending: PendingMoodCheckinV2 = {
    localId,
    rating: input.mood,
    ts: createdAt,
    day_date,
    note: input.note ?? null,
    tags: Array.isArray(input.tags) && input.tags.length ? input.tags.map((t) => String(t)) : null,
    energy: input.energy ?? null,
    source: 'manual',
    enqueuedAt: new Date().toISOString(),
    retryCount: 0,
    kind: 'user',
  };

  await appendPendingMoodCheckin(pending);

  const attempt: PendingMoodCheckinV2 = {
    ...pending,
    retryCount: 1,
    lastAttemptAt: new Date().toISOString(),
  };
  const pushed = await pushPendingMoodRowToSupabase(attempt);
  if (pushed === 'synced') {
    const { data } = await supabase.from('mood_checkins').select('*').eq('id', localId).maybeSingle();
    if (data) {
      await invalidateMoodAndInsightQueries(queryClient);
      return mapRowToMoodCheckin(data as Record<string, unknown>, user.id);
    }
  }

  await invalidateMoodAndInsightQueries(queryClient);
  return pendingToMoodCheckin(pending, user.id);
}
