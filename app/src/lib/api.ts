// C:\Reclaim\app\src\lib\api.ts
// ✅ Updated: make ALL writes RLS-safe by explicitly setting user_id on inserts/upserts where needed,
// and by filtering reads by user_id consistently.
//
// ✅ Added: Insight feedback logging for InsightCard ("logInsightFeedback", "listInsightFeedback")

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HealthPlatform } from '@/lib/health/types';
import { isValidMeditationSessions } from '@/lib/localData/smallModuleMirrors';
import { MEDITATION_LEGACY_ASYNC_STORAGE_KEY } from '@/lib/localData/meditationSessionsRepository';
import {
  deleteLocalSleepSessionsByIds,
  mergeRemoteSleepSessionsIntoLocal,
  listLocalSleepSessions,
} from '@/lib/localData/localSleepRepository';
import { loadReadCache, readCacheKeys, saveReadCache } from '@/lib/localData/readCacheRepository';
import { logger } from './logger';
import { jsDayToPolicy, type MedSchedule } from './medicationSchedulePolicy';
import { resolveCatalogMatchKeyForName } from './medCatalog';
import { enrichMedsWithCatalogMatchKeys, type MedCatalogMatchBackfillRow } from './medCatalogMatch';
import { mergeMedDoseLogsForInsights, mergeSleepSessionsForInsights } from '@/lib/insights/insightContextMerge';
import type { AlphaFeedbackPayload, FeedbackSeverity } from '@/lib/feedback/types';

// -------------------------
// Shared helpers
// -------------------------
async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('No session');
  return data.user;
}

function feedbackSeverityToLogLevel(severity: FeedbackSeverity): 'info' | 'warn' | 'error' {
  if (severity === 'critical') return 'error';
  if (severity === 'major') return 'warn';
  return 'info';
}

export async function createAlphaFeedbackReport(payload: AlphaFeedbackPayload): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const level = feedbackSeverityToLogLevel(payload.severity);

  const { error } = await supabase.from('logs').insert({
    level,
    message: 'alpha_feedback_report',
    details: {
      routeName: payload.routeName,
      scopeType: payload.scope.scopeType,
      componentKey: payload.scope.componentKey,
      componentTitle: payload.scope.componentTitle ?? null,
      tags: payload.scope.tags ?? [],
      category: payload.category,
      severity: payload.severity,
      note: payload.note,
      context: payload.context,
      stateHash: payload.stateHash,
      metadata: payload.metadata,
      queuedAt: payload.queuedAt ?? null,
      submittedAt: new Date().toISOString(),
    },
    user_id: user?.id ?? null,
  });

  if (error) {
    throw new Error(`${error.message} (${error.code ?? 'no-code'})`);
  }
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

// ---------- Local day helpers ----------

/** Device-local YYYY-MM-DD from a Date. Uses Intl when available, falls back to local Date methods. */
export function getLocalDayDate(ts: Date = new Date()): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(ts);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fallback below
  }
  const y = ts.getFullYear();
  const m = `${ts.getMonth() + 1}`.padStart(2, '0');
  const d = `${ts.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** @deprecated Use getLocalDayDate instead. Kept as alias for backward compatibility. */
export const getLocalDayDateZA = getLocalDayDate;

export function parseTags(note: string, selectedTags?: string[]): string[] {
  const tags = new Set<string>();
  if (Array.isArray(selectedTags)) {
    selectedTags.forEach((t) => {
      if (typeof t === 'string' && t.trim()) tags.add(t.trim().toLowerCase().replace(/^#/, ''));
    });
  }
  if (note) {
    const matches = note.match(/#(\w+)/g) || [];
    matches.forEach((m) => tags.add(m.replace(/^#/, '').toLowerCase()));
  }
  return Array.from(tags);
}

// -------------------------
// Core entry model
// -------------------------
export type Entry = {
  id?: string;
  user_id?: string;
  ts?: string;
  day_date?: string;
  mood?: number;
  sleep_hours?: number;
  focus_minutes?: number;
  meds_taken?: boolean;
  note?: string;
  tags?: string[] | null;
};

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Ensures a profile row exists for the current user.
 * Creates it if missing, otherwise no-op.
 * Should be called early (on auth session established) to guarantee profile exists.
 */
export async function ensureProfile(): Promise<void> {
  const user = await requireUser();
  
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  
  if (fetchError) {
    if (__DEV__) {
      console.error('[ensureProfile] Supabase fetch error:', {
        message: fetchError.message,
        code: (fetchError as any).code,
        details: (fetchError as any).details,
        hint: (fetchError as any).hint,
        fullError: fetchError,
      });
    }
    throw fetchError;
  }
  
  // If profile exists, do nothing (avoid overwriting has_onboarded)
  if (existing?.id) return;
  
  const { error } = await supabase
    .from('profiles')
    .insert({ id: user.id, has_onboarded: false });
  
  if (error) {
    if (__DEV__) {
      console.error('[ensureProfile] Supabase error:', {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        fullError: error,
      });
    }
    throw error;
  }
}

export async function insertEntry(entry: Omit<Entry, 'id' | 'user_id' | 'ts'>) {
  const user = await requireUser();

  const payload: any = {
    ...entry,
    user_id: user.id,
  };

  // If caller didn't include day_date, set it using ZA local date
  if (!payload.day_date) {
    payload.day_date = getLocalDayDate(new Date());
  }

  // Optional tags from note (only if entries table supports it)
  if (typeof payload.note === 'string' && payload.note.length) {
    const tags = parseTags(payload.note);
    if (tags.length) payload.tags = tags;
  }

  const { data, error } = await supabase.from('entries').insert(payload).select().single();
  if (error) throw new Error(`${error.message} (${error.code ?? 'no-code'})`);
  return data as Entry;
}

export async function listEntries(limit = 10) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', user.id)
    .order('ts', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`${error.message} (${error.code ?? 'no-code'})`);
  return (data ?? []) as Entry[];
}

// Upsert "today" by checking if you already logged; if yes, update, else insert
export async function upsertTodayEntry(entry: {
  mood?: number;
  sleep_hours?: number;
  focus_minutes?: number;
  meds_taken?: boolean;
  note?: string;
}) {
  const user = await requireUser();

  const day_date = getLocalDayDate(new Date());
  const tags = parseTags(entry.note ?? '', undefined);

  // Clamp mood to valid range (1-5) if provided to satisfy CHECK constraint
  const sanitizedEntry = { ...entry };
  if (sanitizedEntry.mood !== undefined) {
    sanitizedEntry.mood = Math.max(1, Math.min(5, Math.round(sanitizedEntry.mood)));
  }

  // find existing row for today
  const { data: existing, error: selErr } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('day_date', day_date)
    .order('ts', { ascending: false })
    .limit(1);

  if (selErr) throw new Error(selErr.message);

  const payload: any = {
    ...sanitizedEntry,
    user_id: user.id, // ✅ ensure RLS-safe on insert/update
    day_date,
  };

  if (tags.length) payload.tags = tags;

  if (existing && existing.length) {
    const id = existing[0].id;
    const { data, error } = await supabase.from('entries').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase.from('entries').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
}

// last N days (default 7)
export async function listEntriesLastNDays(days = 7) {
  const user = await requireUser();

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('ts', since.toISOString())
    .order('ts', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Entry[];
}

// -------------------------
// Medications
// -------------------------
export type { MedicationSchedule, PrnScheduleMarker, MedSchedule } from './medicationSchedulePolicy';

export type Med = {
  id?: string;
  user_id?: string;
  name: string;
  dose?: string;
  schedule?: MedSchedule;
  /** Stable catalogue row id (`MedCatalogItem.id`); set on upsert/backfill. */
  catalog_match_key?: string | null;
  created_at?: string;
};

export {
  isPrnSchedule,
  isScheduledMed,
  isPrnMed,
  countExpectedDosesInRange,
  computeAdherenceFromSchedule,
} from './medicationSchedulePolicy';

async function fetchMedsFromSupabase(userId: string): Promise<Med[]> {
  const { data, error } = await supabase
    .from('meds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Med[];
}

async function persistMedCatalogMatchKeyBackfill(
  userId: string,
  rows: MedCatalogMatchBackfillRow[],
): Promise<void> {
  if (!rows.length) return;
  await Promise.all(
    rows.map(async ({ id, catalog_match_key }) => {
      const { error } = await supabase
        .from('meds')
        .update({ catalog_match_key })
        .eq('id', id)
        .eq('user_id', userId);
      if (error && __DEV__) {
        logger.debug('[listMeds] catalog_match_key backfill failed', { id, message: error.message });
      }
    }),
  );
}

export async function listMeds(): Promise<Med[]> {
  const user = await requireUser();
  try {
    const rows = await fetchMedsFromSupabase(user.id);
    const { meds, pendingBackfill } = enrichMedsWithCatalogMatchKeys(rows);
    await saveReadCache(user.id, readCacheKeys.meds, meds);
    if (pendingBackfill.length) {
      void persistMedCatalogMatchKeyBackfill(user.id, pendingBackfill).catch((e) => {
        if (__DEV__) logger.debug('[listMeds] catalog_match_key backfill batch failed', e);
      });
    }
    return meds;
  } catch (e) {
    const cached = await loadReadCache<Med[]>(user.id, readCacheKeys.meds);
    if (cached && Array.isArray(cached)) {
      return enrichMedsWithCatalogMatchKeys(cached).meds;
    }
    throw e;
  }
}

export async function upsertMed(m: Omit<Med, 'id' | 'user_id' | 'created_at'> & { id?: string }) {
  const user = await requireUser();

  const catalog_match_key =
    m.catalog_match_key !== undefined ? m.catalog_match_key : resolveCatalogMatchKeyForName(m.name);

  // ✅ Always attach user_id for RLS-safe upsert
  const payload: any = { ...m, catalog_match_key, user_id: user.id };

  const { data, error } = await supabase.from('meds').upsert(payload, { onConflict: 'id' }).select().single();
  if (error) throw new Error(error.message);
  const out = data as Med;
  try {
    const rows = await fetchMedsFromSupabase(user.id);
    await saveReadCache(user.id, readCacheKeys.meds, rows);
  } catch {
    const cached = (await loadReadCache<Med[]>(user.id, readCacheKeys.meds)) ?? [];
    const idx = cached.findIndex((x) => x.id === out.id);
    const next =
      idx >= 0 ? cached.map((x, i) => (i === idx ? out : x)) : [out, ...cached.filter((x) => x.id !== out.id)];
    await saveReadCache(user.id, readCacheKeys.meds, next);
  }
  return out;
}

export async function deleteMed(id: string) {
  const user = await requireUser();

  const { error } = await supabase.from('meds').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);
  try {
    const rows = await fetchMedsFromSupabase(user.id);
    await saveReadCache(user.id, readCacheKeys.meds, rows);
  } catch {
    const cached = await loadReadCache<Med[]>(user.id, readCacheKeys.meds);
    if (cached?.length) {
      await saveReadCache(
        user.id,
        readCacheKeys.meds,
        cached.filter((x) => x.id !== id),
      );
    }
  }
}

// ---- schedule parsing (generate upcoming reminder Date objects) ----

// times: ["08:00","21:30"]; days: [1..7]
export function upcomingDoseTimes(schedule: { times: string[]; days: number[] }, count = 14): Date[] {
  const out: Date[] = [];
  if (!schedule?.times?.length || !schedule?.days?.length) return out;

  let cursor = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);

  while (out.length < count && cursor <= end) {
    const policyDay = jsDayToPolicy(cursor.getDay());
    if (schedule.days.includes(policyDay)) {
      for (const t of schedule.times) {
        const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
        if (Number.isFinite(hh) && Number.isFinite(mm)) {
          const when = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hh, mm, 0, 0);
          if (when > new Date()) out.push(when);
          if (out.length >= count) break;
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

// quick parser from user inputs:
// timesCsv: "08:00,21:30"
// daysCsv:  "1,2,3,4,5"  or "1-5"  (Mon-Fri) or "1-7"
export function parseSchedule(timesCsv: string, daysCsv: string): { times: string[]; days: number[] } {
  const times = timesCsv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  let days: number[] = [];
  const parts = daysCsv.split(',').map((s) => s.trim());
  for (const p of parts) {
    if (!p) continue;
    if (p.includes('-')) {
      const [a, b] = p.split('-').map((x) => parseInt(x, 10));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        for (let d = start; d <= end; d++) days.push(d);
      }
    } else {
      const n = parseInt(p, 10);
      if (Number.isFinite(n)) days.push(n);
    }
  }
  days = Array.from(new Set(days.filter((d) => d >= 1 && d <= 7)));
  return { times, days };
}

export type MedLog = {
  id?: string;
  user_id?: string;
  med_id: string;
  taken_at?: string | null; // ISO
  status: 'taken' | 'skipped' | 'missed';
  scheduled_for?: string | null; // ISO
  note?: string | null;
};

// ✅ IMPORTANT FIX: ensure user_id is set on meds_log writes (your reads filter by user_id)
export async function logMedDose(input: {
  med_id: string;
  status: 'taken' | 'skipped' | 'missed';
  taken_at?: string;
  scheduled_for?: string;
  note?: string;
}) {
  const user = await requireUser();

  const taken_at =
    input.status === 'taken' && !input.taken_at ? new Date().toISOString() : (input.taken_at ?? null);

  const payload = {
    user_id: user.id, // ✅ RLS-safe
    med_id: input.med_id,
    status: input.status,
    taken_at,
    scheduled_for: input.scheduled_for ?? null,
    note: input.note ?? null,
  };

  const { data, error } = await supabase.from('meds_log').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data as MedLog;
}

export async function listMedLogsLastNDays(days = 7) {
  const user = await requireUser();

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('meds_log')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as MedLog[];
}

// -------------------------
// Mood (Supabase + local mirror)
// -------------------------
export type MoodEntry = {
  id: string;
  rating: number; // (your UI might treat this 1..10; DB checkins are 1..5 — keep as number)
  note?: string;
  created_at: string; // ISO
  tags?: string[];
  day_date?: string;
  /** True when row is only in the local pending outbox (Phase 1 mood canonical model). */
  _syncPending?: boolean;
};

const MOOD_KEY = '@reclaim/mood/v1';

/**
 * Legacy local-only mood list under `MOOD_KEY`.
 * @deprecated Product reads should use canonical mood (`@/lib/mood/moodService`). Kept for export/debug and legacy storage reads.
 */
export async function listMood(limit = 100): Promise<MoodEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(MOOD_KEY);
    if (!raw) return [];
    const rows: MoodEntry[] = JSON.parse(raw);
    if (!Array.isArray(rows)) return [];
    const sorted = rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return sorted.slice(0, limit);
  } catch (error) {
    console.warn('listMood error:', error);
    return [];
  }
}

export async function upsertMood(entry: MoodEntry): Promise<MoodEntry> {
  const raw = await AsyncStorage.getItem(MOOD_KEY);
  const rows: MoodEntry[] = raw ? JSON.parse(raw) : [];
  const idx = rows.findIndex((r) => r.id === entry.id);
  if (idx >= 0) rows[idx] = entry;
  else rows.unshift(entry);
  await AsyncStorage.setItem(MOOD_KEY, JSON.stringify(rows));
  return entry;
}

export async function deleteMood(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(MOOD_KEY);
  const rows: MoodEntry[] = raw ? JSON.parse(raw) : [];
  await AsyncStorage.setItem(MOOD_KEY, JSON.stringify(rows.filter((r) => r.id !== id)));
}

export async function latestMood(): Promise<MoodEntry | null> {
  const { getCanonicalMoodCheckinsDaysEntries } = await import('@/lib/mood/moodService');
  const rows = await getCanonicalMoodCheckinsDaysEntries(30);
  return rows[0] ?? null;
}

export async function weekAverageMood(): Promise<number | null> {
  const now = new Date();
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { getCanonicalMoodCheckinsDaysEntries } = await import('@/lib/mood/moodService');
  const rows = await getCanonicalMoodCheckinsDaysEntries(30);
  const week = rows.filter((r) => new Date(r.created_at) >= past);
  if (!week.length) return null;
  const sum = week.reduce((acc, r) => acc + (r.rating || 0), 0);
  return Math.round((sum / week.length) * 10) / 10;
}

export function createMoodEntry(rating: number, note?: string): MoodEntry {
  const id = (globalThis.crypto as any)?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2);
  return { id, rating, note, created_at: new Date().toISOString() };
}

// ---- Supabase mood_checkins table types ----
export type MoodCheckin = {
  id: string;
  user_id: string;
  created_at: string; // ISO
  mood: number; // 1..5
  energy?: number | null; // 1..5
  tags?: string[] | null;
  note?: string | null;
  ctx?: Record<string, any> | null;
};

export type UpsertMoodInput = {
  mood: number; // required
  energy?: number;
  tags?: string[];
  note?: string;
  /** @deprecated Not present on current `mood_checkins` schema — ignored on insert. */
  ctx?: Record<string, any>;
  created_at?: string;
};

/** Map `mood_checkins` rows whether they use legacy (`mood`, `created_at`) or current (`rating`, `ts`, `day_date`) columns. */
function mapMoodCheckinRowToLegacyShape(row: Record<string, unknown>): MoodCheckin {
  const r = row as any;
  const created_at =
    (r.created_at as string) ||
    (r.ts as string) ||
    (typeof r.day_date === 'string' ? `${r.day_date}T12:00:00.000Z` : new Date().toISOString());
  const moodVal =
    typeof r.mood === 'number' ? r.mood : typeof r.rating === 'number' ? r.rating : 0;
  return {
    id: r.id as string,
    user_id: r.user_id as string,
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

export async function listMoodCheckins(limit = 30): Promise<MoodCheckin[]> {
  const { getCanonicalMoodCheckinsMerged } = await import('@/lib/mood/moodService');
  return getCanonicalMoodCheckinsMerged(limit);
}

export async function listMoodCheckinsRange(startISO: string, endISO: string): Promise<MoodCheckin[]> {
  const { getCanonicalMoodCheckinsRange } = await import('@/lib/mood/moodService');
  return getCanonicalMoodCheckinsRange(startISO, endISO);
}

export async function addMoodCheckin(input: UpsertMoodInput): Promise<MoodCheckin> {
  const { submitAddMoodCheckinDeviceFirst } = await import('@/lib/mood/moodService');
  return submitAddMoodCheckinDeviceFirst(input);
}

export async function deleteMoodCheckin(id: string): Promise<void> {
  const user = await requireUser();
  const { removePendingMoodCheckinByLocalId } = await import('@/lib/mood/moodOutbox');
  await removePendingMoodCheckinByLocalId(id);

  const { error } = await supabase.from('mood_checkins').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;

  const { invalidateMoodAndInsightQueries } = await import('@/lib/mood/moodQueryInvalidation');
  const { queryClient } = await import('@/lib/queryClient');
  await invalidateMoodAndInsightQueries(queryClient);
}

// Roll up mood_checkins into daily latest-per-day series
export async function listDailyMoodFromCheckins(days: number): Promise<MoodEntry[]> {
  let user;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    return [];
  }

  if (!user) return [];

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const since = getLocalDayDate(start);

  const { data, error } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('day_date', since)
    .order('ts', { ascending: false });

  if (error) {
    console.warn('listDailyMoodFromCheckins error:', error.message);
    return [];
  }

  // Deduplicate by day_date (latest per day)
  const byDay = new Map<string, any>();
  for (const row of data ?? []) {
    if (!row?.day_date) continue;
    if (!byDay.has(row.day_date)) byDay.set(row.day_date, row);
  }

  return Array.from(byDay.values()).map((row: any) => ({
    id: row.id ?? `${user.id}:${row.day_date}`,
    rating: row.rating,
    note: row.note ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : undefined,
    created_at: row.ts ?? row.created_at ?? `${row.day_date}T00:00:00Z`,
    day_date: row.day_date,
  }));
}


export async function createMoodCheckin(input: {
  rating: number;
  note?: string;
  tags?: string[];
  ts?: Date;
  source?: string;
}) {
  const { submitCreateMoodCheckinDeviceFirst } = await import('@/lib/mood/moodService');
  return submitCreateMoodCheckinDeviceFirst(input);
}

export async function listMoodCheckinsDays(days: number): Promise<MoodEntry[]> {
  const { getCanonicalMoodCheckinsDaysEntries } = await import('@/lib/mood/moodService');
  return getCanonicalMoodCheckinsDaysEntries(days);
}

/** Canonical daily rollup: server history + durable pending outbox (Phase 1 mood model). */
export async function listCanonicalMoodEntriesForDays(days: number): Promise<MoodEntry[]> {
  const { getCanonicalMoodEntriesForDays } = await import('@/lib/mood/moodService');
  return getCanonicalMoodEntriesForDays(days);
}

export async function listDailyMoodFromSupabase(days: number): Promise<MoodEntry[]> {
  const user = await requireUser();

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const since = getLocalDayDate(start);

  const { data, error } = await supabase
    .from('entries')
    .select('mood, note, tags, ts, day_date')
    .eq('user_id', user.id)
    .not('mood', 'is', null)
    .gte('day_date', since)
    .order('day_date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: `${user.id}:${row.day_date ?? row.created_at}`,
    rating: row.mood,
    note: row.note ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : undefined,
    created_at: row.ts ?? (row.day_date ? `${row.day_date}T00:00:00Z` : new Date().toISOString()),
    day_date: row.day_date ?? undefined,
  }));
}

// -------------------------
// Mindfulness events
// -------------------------
export type MindfulnessEvent = {
  id: string;
  user_id: string;
  created_at: string;
  trigger_type: 'manual' | 'rule' | 'reminder';
  reason?: string | null;
  intervention: 'box_breath_60' | 'five_senses' | 'reality_check' | 'urge_surf' | string;
  outcome?: 'completed' | 'skipped' | 'partial' | null;
  ctx?: Record<string, any> | null;
};

export async function logMindfulnessEvent(input: Omit<MindfulnessEvent, 'id' | 'user_id' | 'created_at'>) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('mindfulness_events')
    .insert({ ...input, user_id: user.id })
    .select('*')
    .single();

  if (error) throw error;
  return data as MindfulnessEvent;
}

export async function listMindfulnessEvents(limit = 30) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('mindfulness_events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as MindfulnessEvent[];
}

// -------------------------
// Sleep
// -------------------------
export type SleepSession = {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  source: 'healthkit' | 'googlefit' | 'healthconnect' | 'samsung_health' | 'phone_infer' | 'manual';
  // Derived classification for UI/data alignment (main/night vs nap vs other)
  session_type?: 'main' | 'nap' | 'other' | null;
  quality?: number | null;
  note?: string | null;
  created_at: string;
  duration_minutes?: number | null;
  efficiency?: number | null;
  stages?: Array<{ start: string; end: string; stage: string }> | null;
  metadata?: {
    avgHeartRate?: number;
    minHeartRate?: number;
    maxHeartRate?: number;
    bodyTemperature?: number;
    skinTemperature?: number;
    deepSleepMinutes?: number;
    remSleepMinutes?: number;
    lightSleepMinutes?: number;
    awakeMinutes?: number;
    hrvRmssdMs?: number;
    avgRespiratoryRate?: number;
    avgSpO2?: number;
    minSpO2?: number;
  } | null;
};

export type SleepCandidate = {
  id: string;
  user_id: string;
  start_guess: string;
  end_guess: string;
  confidence: number;
  ctx?: Record<string, any> | null;
  created_at: string;
};

export type SleepPrefs = {
  user_id: string;
  target_sleep_minutes?: number | null;
  typical_wake_time?: string | null; // 'HH:MM:SS'
  work_days?: number[] | null;
  bedtime_window_start?: string | null;
  bedtime_window_end?: string | null;
  updated_at: string;
};

// CRUD
export async function upsertSleepPrefs(prefs: Partial<SleepPrefs>) {
  const user = await requireUser();

  const payload: any = {
    ...prefs,
    user_id: user.id, // ✅ ensure upsert attaches correct user for RLS
  };

  const { data, error } = await supabase
    .from('sleep_prefs')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as SleepPrefs;
}

export async function getSleepPrefs() {
  const user = await requireUser();

  const { data, error } = await supabase.from('sleep_prefs').select('*').eq('user_id', user.id).single();
  if (error && (error as any).code !== 'PGRST116') throw error; // not found ok
  return (data ?? null) as SleepPrefs | null;
}

export async function listSleepSessions(days = 14) {
  const user = await requireUser();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  try {
    const { data, error } = await supabase
      .from('sleep_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', sinceIso)
      .order('start_time', { ascending: false });

    if (error) throw error;
    const rows = (data ?? []) as SleepSession[];
    try {
      await mergeRemoteSleepSessionsIntoLocal(user.id, rows);
    } catch (e) {
      logger.debug('[listSleepSessions] local mirror failed', (e as Error)?.message);
    }
    return rows;
  } catch (e) {
    try {
      const localRows = await listLocalSleepSessions(user.id, days);
      if (localRows.length) return localRows;
    } catch (localErr) {
      logger.debug('[listSleepSessions] local fallback failed', (localErr as Error)?.message);
    }
    throw e;
  }
}

/**
 * Insights / analytics: merge local sleep mirror with remote so empty or failed remote fetches
 * do not drop on-device history (operational truth for “last night” context).
 */
export async function listSleepSessionsForInsights(days = 14): Promise<SleepSession[]> {
  const user = await requireUser();
  const local = await listLocalSleepSessions(user.id, days);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  try {
    const { data, error } = await supabase
      .from('sleep_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', sinceIso)
      .order('start_time', { ascending: false });

    if (error) throw error;
    const remoteRows = (data ?? []) as SleepSession[];
    try {
      await mergeRemoteSleepSessionsIntoLocal(user.id, remoteRows);
    } catch (e) {
      logger.debug('[listSleepSessionsForInsights] local mirror update failed', (e as Error)?.message);
    }
    return mergeSleepSessionsForInsights(local, remoteRows);
  } catch (e) {
    logger.debug('[listSleepSessionsForInsights] remote failed; local mirror only', (e as Error)?.message);
    return local.sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    );
  }
}

// ✅ IMPORTANT FIX: ensure user_id is set on manual sleep inserts (your reads filter user_id)
export async function addSleepSession(input: Omit<SleepSession, 'id' | 'user_id' | 'created_at'>) {
  const user = await requireUser();

  const payload: any = {
    ...input,
    user_id: user.id,
  };

  const { data, error } = await supabase.from('sleep_sessions').insert(payload).select('*').single();
  if (error) throw error;
  const row = data as SleepSession;
  try {
    await mergeRemoteSleepSessionsIntoLocal(user.id, [row]);
  } catch (e) {
    logger.debug('[addSleepSession] local mirror failed', (e as Error)?.message);
  }
  return row;
}

const HEALTH_PLATFORM_TO_SLEEP_SOURCE: Record<HealthPlatform, SleepSession['source']> = {
  apple_healthkit: 'healthkit',
  google_fit: 'googlefit',
  health_connect: 'healthconnect',
  samsung_health: 'samsung_health',
  garmin: 'manual',
  huawei: 'manual',
  unknown: 'manual',
};

function sleepSessionId(userId: string, startISO: string, endISO: string) {
  const input = `${userId}|${startISO}|${endISO}`;
  const bytes = new Uint8Array(16);

  for (let i = 0; i < input.length; i++) {
    const idx = i % 16;
    const code = input.charCodeAt(i);
    bytes[idx] = (bytes[idx] + code + idx) & 0xff;
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function upsertSleepSessionFromHealth(input: {
  startTime: Date;
  endTime: Date;
  source: HealthPlatform;
  quality?: number;
  durationMinutes?: number;
  efficiency?: number;
  stages?: Array<{ start: Date; end: Date; stage: string }>;
  metadata?: {
    avgHeartRate?: number;
    minHeartRate?: number;
    maxHeartRate?: number;
    bodyTemperature?: number;
    skinTemperature?: number;
    deepSleepMinutes?: number;
    remSleepMinutes?: number;
    lightSleepMinutes?: number;
    awakeMinutes?: number;
    hrvRmssdMs?: number;
    avgRespiratoryRate?: number;
    avgSpO2?: number;
    minSpO2?: number;
    sessionType?: 'main' | 'nap' | 'other';
  };
}): Promise<void> {
  const user = await requireUser();

  const startISO = input.startTime.toISOString();
  const endISO = input.endTime.toISOString();

  const stagesJSON = input.stages
    ? input.stages.map((stage) => ({
        start: stage.start.toISOString(),
        end: stage.end.toISOString(),
        stage: stage.stage,
      }))
    : null;

  const row: any = {
    id: sleepSessionId(user.id, startISO, endISO),
    user_id: user.id,
    start_time: startISO,
    end_time: endISO,
    source: HEALTH_PLATFORM_TO_SLEEP_SOURCE[input.source] ?? 'manual',
  };

  const qualityFromMetadata = (input.metadata as any)?.quality;
  const quality = typeof input.quality === 'number' ? input.quality : qualityFromMetadata;
  if (typeof quality === 'number' && Number.isFinite(quality)) {
    row.quality = Math.round(quality);
  }
  if (typeof input.durationMinutes === 'number' && Number.isFinite(input.durationMinutes)) {
    row.duration_minutes = Math.round(input.durationMinutes);
  }
  if (input.efficiency !== undefined && input.efficiency !== null) row.efficiency = input.efficiency;
  if (stagesJSON && stagesJSON.length > 0) row.stages = stagesJSON;

  if (input.metadata) {
    const metadata = { ...input.metadata };
    if (metadata.bodyTemperature && !metadata.skinTemperature) {
      metadata.skinTemperature = metadata.bodyTemperature;
    }
    // Mirror scalar metadata fields into dedicated columns where present.
    if (typeof metadata.deepSleepMinutes === 'number' && Number.isFinite(metadata.deepSleepMinutes)) {
      row.deep_sleep_minutes = Math.round(metadata.deepSleepMinutes);
    }
    if (typeof metadata.remSleepMinutes === 'number' && Number.isFinite(metadata.remSleepMinutes)) {
      row.rem_sleep_minutes = Math.round(metadata.remSleepMinutes);
    }
    if (typeof metadata.lightSleepMinutes === 'number' && Number.isFinite(metadata.lightSleepMinutes)) {
      row.light_sleep_minutes = Math.round(metadata.lightSleepMinutes);
    }
    if (typeof metadata.awakeMinutes === 'number' && Number.isFinite(metadata.awakeMinutes)) {
      row.awake_minutes = Math.round(metadata.awakeMinutes);
    }
    if (typeof metadata.avgHeartRate === 'number' && Number.isFinite(metadata.avgHeartRate)) {
      row.avg_heart_rate = metadata.avgHeartRate;
    }
    if (typeof metadata.minHeartRate === 'number' && Number.isFinite(metadata.minHeartRate)) {
      row.min_heart_rate = metadata.minHeartRate;
    }
    if (typeof metadata.maxHeartRate === 'number' && Number.isFinite(metadata.maxHeartRate)) {
      row.max_heart_rate = metadata.maxHeartRate;
    }
    if (typeof metadata.hrvRmssdMs === 'number' && Number.isFinite(metadata.hrvRmssdMs)) {
      row.hrv_rmssd_ms = metadata.hrvRmssdMs;
    }
    if (
      typeof metadata.avgRespiratoryRate === 'number' &&
      Number.isFinite(metadata.avgRespiratoryRate)
    ) {
      row.avg_respiratory_rate = metadata.avgRespiratoryRate;
    }
    if (typeof metadata.avgSpO2 === 'number' && Number.isFinite(metadata.avgSpO2)) {
      row.avg_spo2 = metadata.avgSpO2;
    }
    if (typeof metadata.minSpO2 === 'number' && Number.isFinite(metadata.minSpO2)) {
      row.min_spo2 = metadata.minSpO2;
    }
    if (typeof metadata.skinTemperature === 'number' && Number.isFinite(metadata.skinTemperature)) {
      row.skin_temperature = metadata.skinTemperature;
    }
    if (typeof metadata.sessionType === 'string') {
      row.session_type = metadata.sessionType;
    }
    row.metadata = metadata;
  }

  row.created_at = new Date().toISOString();

  try {
    await mergeRemoteSleepSessionsIntoLocal(user.id, [row as SleepSession]);
  } catch (e) {
    logger.debug('[upsertSleepSessionFromHealth] pre-cloud local mirror failed', (e as Error)?.message);
  }

  const { data, error } = await supabase.from('sleep_sessions').upsert(row, { onConflict: 'id' }).select('*').single();

  if (error) {
    console.error('[upsertSleepSessionFromHealth] Supabase error:', {
      error,
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: (error as any).code,
      row: {
        id: row.id,
        user_id: row.user_id,
        start_time: row.start_time,
        end_time: row.end_time,
        source: row.source,
      },
    });
    throw error;
  }

  console.log('[upsertSleepSessionFromHealth] Successfully saved sleep session:', {
    id: data?.id,
    start_time: row.start_time,
    end_time: row.end_time,
    source: row.source,
  });

  try {
    if (data) await mergeRemoteSleepSessionsIntoLocal(user.id, [data as SleepSession]);
  } catch (e) {
    logger.debug('[upsertSleepSessionFromHealth] local mirror failed', (e as Error)?.message);
  }
}

/**
 * Delete sleep sessions by their session keys (startISO|endISO format).
 * Used to remove superseded split sessions after consolidation.
 */
export async function deleteSleepSessionsByKeys(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const user = await requireUser();

  const ids: string[] = [];
  for (const key of keys) {
    const parts = key.split('|');
    if (parts.length !== 2) continue;
    const [startISO, endISO] = parts;
    if (!startISO || !endISO) continue;
    ids.push(sleepSessionId(user.id, startISO, endISO));
  }

  if (ids.length === 0) return 0;
  const { data, error } = await supabase.from('sleep_sessions').delete().in('id', ids).select('id');
  if (error) {
    console.error('[deleteSleepSessionsByKeys]', error);
    throw error;
  }
  try {
    await deleteLocalSleepSessionsByIds(ids);
  } catch (e) {
    logger.debug('[deleteSleepSessionsByKeys] local delete failed', (e as Error)?.message);
  }
  return data?.length ?? 0;
}

// -------------------------
// Activity + vitals daily
// -------------------------

const READ_CACHE_DAY_WINDOWS = [7, 14, 30] as const;

export type DailyActivitySummary = {
  id: string;
  user_id: string;
  activity_date: string;
  steps?: number | null;
  active_energy?: number | null;
  source?: HealthPlatform | null;
  created_at?: string;
};

export type DailyVitalsSummary = {
  id: string;
  user_id: string;
  vitals_date: string;
  resting_heart_rate_bpm?: number | null;
  hrv_rmssd_ms?: number | null;
  avg_heart_rate_bpm?: number | null;
  min_heart_rate_bpm?: number | null;
  max_heart_rate_bpm?: number | null;
  source?: HealthPlatform | null;
  created_at?: string;
};

async function mergeActivityDailyIntoCaches(userId: string, row: DailyActivitySummary) {
  for (const days of READ_CACHE_DAY_WINDOWS) {
    const key = readCacheKeys.activityDaily(days);
    const prev = await loadReadCache<DailyActivitySummary[]>(userId, key);
    const base = prev && Array.isArray(prev) ? [...prev] : [];
    const idx = base.findIndex((r) => r.activity_date === row.activity_date || r.id === row.id);
    if (idx >= 0) base[idx] = row;
    else base.unshift(row);
    base.sort((a, b) => (b.activity_date ?? '').localeCompare(a.activity_date ?? ''));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    cutoff.setHours(0, 0, 0, 0);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const trimmed = base.filter((r) => (r.activity_date ?? '') >= cutoffStr);
    await saveReadCache(userId, key, trimmed);
  }
}

async function mergeVitalsDailyIntoCaches(userId: string, row: DailyVitalsSummary) {
  for (const days of READ_CACHE_DAY_WINDOWS) {
    const key = readCacheKeys.vitalsDaily(days);
    const prev = await loadReadCache<DailyVitalsSummary[]>(userId, key);
    const base = prev && Array.isArray(prev) ? [...prev] : [];
    const idx = base.findIndex((r) => r.vitals_date === row.vitals_date || r.id === row.id);
    if (idx >= 0) base[idx] = row;
    else base.unshift(row);
    base.sort((a, b) => (b.vitals_date ?? '').localeCompare(a.vitals_date ?? ''));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    cutoff.setHours(0, 0, 0, 0);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const trimmed = base.filter((r) => (r.vitals_date ?? '') >= cutoffStr);
    await saveReadCache(userId, key, trimmed);
  }
}

export async function upsertDailyActivityFromHealth(input: {
  date: Date;
  steps?: number | null;
  activeEnergy?: number | null;
  source?: HealthPlatform | null;
}): Promise<void> {
  const user = await requireUser();

  const activityDate = getLocalDayDate(input.date);

  const row = {
    id: `${user.id}_${activityDate}`,
    user_id: user.id,
    activity_date: activityDate,
    steps: input.steps ?? null,
    active_energy: input.activeEnergy ?? null,
    source: input.source ?? null,
  };

  const { error } = await supabase.from('activity_daily').upsert(row, { onConflict: 'id' }).select('id').single();
  if (error) throw error;
  await mergeActivityDailyIntoCaches(user.id, row as DailyActivitySummary);
}

export async function upsertVitalsDailyFromHealth(input: {
  date: Date;
  restingHeartRateBpm?: number | null;
  hrvRmssdMs?: number | null;
  avgHeartRateBpm?: number | null;
  minHeartRateBpm?: number | null;
  maxHeartRateBpm?: number | null;
  source?: HealthPlatform | null;
}): Promise<void> {
  const user = await requireUser();

  const vitalsDate = getLocalDayDate(input.date);

  const row = {
    id: `${user.id}_${vitalsDate}`,
    user_id: user.id,
    vitals_date: vitalsDate,
    resting_heart_rate_bpm: input.restingHeartRateBpm ?? null,
    hrv_rmssd_ms: input.hrvRmssdMs ?? null,
    avg_heart_rate_bpm: input.avgHeartRateBpm ?? null,
    min_heart_rate_bpm: input.minHeartRateBpm ?? null,
    max_heart_rate_bpm: input.maxHeartRateBpm ?? null,
    source: input.source ?? null,
  };

  const { error } = await supabase.from('vitals_daily').upsert(row, { onConflict: 'id' }).select('id').single();
  if (error) throw error;
  await mergeVitalsDailyIntoCaches(user.id, row as DailyVitalsSummary);
}

export async function getRestingHeartRateForDate(dateStr: string): Promise<number | null> {
  const user = await requireUser();
  const id = `${user.id}_${dateStr}`;
  try {
    const { data, error } = await supabase
      .from('vitals_daily')
      .select('resting_heart_rate_bpm')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    const bpm = data?.resting_heart_rate_bpm;
    return typeof bpm === 'number' && Number.isFinite(bpm) ? bpm : null;
  } catch {
    for (const days of READ_CACHE_DAY_WINDOWS) {
      const vitals = await loadReadCache<DailyVitalsSummary[]>(user.id, readCacheKeys.vitalsDaily(days));
      const hit = vitals?.find((v) => v.vitals_date === dateStr);
      const bpm = hit?.resting_heart_rate_bpm;
      if (typeof bpm === 'number' && Number.isFinite(bpm)) return bpm;
    }
    return null;
  }
}

export async function listDailyActivitySummaries(days = 14): Promise<DailyActivitySummary[]> {
  const user = await requireUser();

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const startStr = start.toISOString().slice(0, 10);

  try {
    const { data, error } = await supabase
      .from('activity_daily')
      .select('*')
      .eq('user_id', user.id)
      .gte('activity_date', startStr)
      .order('activity_date', { ascending: false });

    if (error) throw error;
    const rows = (data ?? []) as DailyActivitySummary[];
    await saveReadCache(user.id, readCacheKeys.activityDaily(days), rows);
    return rows;
  } catch (e) {
    const cached = await loadReadCache<DailyActivitySummary[]>(user.id, readCacheKeys.activityDaily(days));
    if (cached && Array.isArray(cached)) return cached;
    throw e;
  }
}

export async function listDailyVitalsSummaries(days = 14): Promise<DailyVitalsSummary[]> {
  const user = await requireUser();

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const startStr = start.toISOString().slice(0, 10);

  try {
    const { data, error } = await supabase
      .from('vitals_daily')
      .select('*')
      .eq('user_id', user.id)
      .gte('vitals_date', startStr)
      .order('vitals_date', { ascending: false });

    if (error) throw error;
    const rows = (data ?? []) as DailyVitalsSummary[];
    await saveReadCache(user.id, readCacheKeys.vitalsDaily(days), rows);
    return rows;
  } catch (e) {
    const cached = await loadReadCache<DailyVitalsSummary[]>(user.id, readCacheKeys.vitalsDaily(days));
    if (cached && Array.isArray(cached)) return cached;
    throw e;
  }
}

// -------------------------
// Sleep candidates
// -------------------------
export async function listSleepCandidates(limit = 3) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('sleep_candidates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SleepCandidate[];
}

// ✅ IMPORTANT FIX: ensure user_id is set on insert
export async function insertSleepCandidate(input: Omit<SleepCandidate, 'id' | 'user_id' | 'created_at'>) {
  const user = await requireUser();

  const payload: any = {
    ...input,
    user_id: user.id,
  };

  const { data, error } = await supabase.from('sleep_candidates').insert(payload).select('*').single();
  if (error) throw error;
  return data as SleepCandidate;
}

export async function resolveSleepCandidate(id: string, accept: boolean, note?: string) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('sleep_candidates')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;

  if (accept) {
    await addSleepSession({
      start_time: data.start_guess,
      end_time: data.end_guess,
      source: 'phone_infer',
      quality: null,
      note,
    });
  }

  await supabase.from('sleep_candidates').delete().eq('id', id).eq('user_id', user.id);
}

// -------------------------
// Meditation (local only)
// -------------------------
export type MeditationSession = {
  id: string;
  startTime: string; // ISO
  endTime?: string; // ISO
  durationSec?: number;
  note?: string;
  meditationType?: import('./meditations').MeditationType;
};

const MEDITATION_KEY = MEDITATION_LEGACY_ASYNC_STORAGE_KEY;

function parseMeditationsFromAsyncStorage(raw: string | null): MeditationSession[] | null {
  if (raw === null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    if (parsed.length === 0) return [];
    if (!isValidMeditationSessions(parsed)) return null;
    return parsed as MeditationSession[];
  } catch {
    return null;
  }
}

async function alignMeditationLegacyAsyncStorage(rows: MeditationSession[]): Promise<void> {
  const raw = await AsyncStorage.getItem(MEDITATION_KEY);
  if (raw === JSON.stringify(rows)) return;
  await AsyncStorage.setItem(MEDITATION_KEY, JSON.stringify(rows));
}

async function readMeditations(): Promise<MeditationSession[]> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      const { loadMeditationSessionsForUser, tryMigrateMeditationsFromAsyncStorage } = await import(
        '@/lib/localData/meditationSessionsRepository'
      );
      const canonical = await loadMeditationSessionsForUser(uid);
      if (canonical !== null) {
        await alignMeditationLegacyAsyncStorage(canonical as MeditationSession[]);
        return canonical as MeditationSession[];
      }
      const migrated = await tryMigrateMeditationsFromAsyncStorage(uid);
      if (migrated !== null) {
        await alignMeditationLegacyAsyncStorage(migrated as MeditationSession[]);
        return migrated as MeditationSession[];
      }
      return [];
    }
  } catch (e) {
    logger.warn('[meditation] canonical read failed', e);
  }

  const raw = await AsyncStorage.getItem(MEDITATION_KEY);
  const fromAs = parseMeditationsFromAsyncStorage(raw);
  return fromAs ?? [];
}

async function writeMeditations(rows: MeditationSession[]) {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      const { saveMeditationSessionsForUser } = await import('@/lib/localData/meditationSessionsRepository');
      await saveMeditationSessionsForUser(uid, rows);
    }
  } catch {
    // local DB optional on failure
  }
  await AsyncStorage.setItem(MEDITATION_KEY, JSON.stringify(rows));
}

export async function listMeditations(): Promise<MeditationSession[]> {
  const rows = await readMeditations();
  return rows.sort((a, b) => b.startTime.localeCompare(a.startTime));
}

export async function upsertMeditation(session: MeditationSession): Promise<MeditationSession> {
  const rows = await readMeditations();
  const idx = rows.findIndex((r) => r.id === session.id);
  if (idx >= 0) rows[idx] = session;
  else rows.unshift(session);
  await writeMeditations(rows);
  return session;
}

export async function deleteMeditation(id: string): Promise<void> {
  const rows = await readMeditations();
  await writeMeditations(rows.filter((r) => r.id !== id));
}

export function createMeditationStart(note?: string, meditationType?: import('./meditations').MeditationType): MeditationSession {
  const id = (globalThis.crypto as any)?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2);
  return {
    id,
    startTime: new Date().toISOString(),
    note,
    meditationType,
  };
}

export function finishMeditation(s: MeditationSession): MeditationSession {
  const end = new Date();
  const start = new Date(s.startTime);
  const durationSec = Math.max(0, Math.round((+end - +start) / 1000));
  return { ...s, endTime: end.toISOString(), durationSec };
}

// -------------------------
// Med dose logs (local mirror + remote)
// -------------------------
export type MedDoseLog = {
  id: string;
  med_id: string;
  status: 'taken' | 'missed' | 'skipped';
  scheduled_for: string; // ISO of planned dose time
  taken_at?: string | null; // ISO when taken (if taken)
  created_at?: string; // optional
};

/** Alias: unified client dose event shape (offline queue + Supabase `meds_log`). */
export type MedicationDoseEvent = MedDoseLog;

const MED_LOGS_KEY = '@reclaim/meds/logs/v1';

export async function listMedDoseLogs(): Promise<MedDoseLog[]> {
  const raw = await AsyncStorage.getItem(MED_LOGS_KEY);
  const rows: MedDoseLog[] = raw ? JSON.parse(raw) : [];
  return rows.sort((a, b) => (b.scheduled_for ?? '').localeCompare(a.scheduled_for ?? ''));
}

export async function listMedDoseLogsBetween(startISO: string, endISO: string): Promise<MedDoseLog[]> {
  const rows = await listMedDoseLogs();
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return rows.filter((r) => {
    const t = new Date(r.scheduled_for).getTime();
    return t >= s && t <= e;
  });
}

export async function listMedDoseLogsLastNDays(n: number): Promise<MedDoseLog[]> {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (n - 1));
  start.setHours(0, 0, 0, 0);
  return listMedDoseLogsBetween(start.toISOString(), end.toISOString());
}

export async function listMedDoseLogsRemoteLastNDays(days = 7): Promise<MedDoseLog[]> {
  const user = await requireUser();

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('meds_log')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []).map((row: any) => ({
    id: row.id,
    med_id: row.med_id,
    status: row.status,
    scheduled_for: row.scheduled_for ?? row.created_at ?? null,
    taken_at: row.taken_at ?? null,
    created_at: row.created_at ?? null,
  })) as MedDoseLog[];

  return rows;
}

/**
 * Insights: merge durable local dose logs (AsyncStorage) with `meds_log` so remote gaps/offline
 * data still inform adherence; slot-deduped to avoid double-counting the same scheduled dose.
 *
 * **Also the canonical reader for user-visible medication dose lists** (dashboard, adherence, hub).
 */
export async function listMedDoseLogsForInsights(days = 7): Promise<MedDoseLog[]> {
  const user = await requireUser();
  const local = await listMedDoseLogsLastNDays(days);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  try {
    const { data, error } = await supabase
      .from('meds_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    const remote = (data ?? []).map((row: any) => ({
      id: row.id,
      med_id: row.med_id,
      status: row.status,
      scheduled_for: row.scheduled_for ?? row.created_at ?? null,
      taken_at: row.taken_at ?? null,
      created_at: row.created_at ?? null,
    })) as MedDoseLog[];
    return mergeMedDoseLogsForInsights(local, remote);
  } catch (e) {
    logger.debug('[listMedDoseLogsForInsights] remote failed; local logs only', (e as Error)?.message);
    return local;
  }
}

/** Alias: merged local + Supabase dose logs for UI surfaces (same merge policy as insights). */
export async function listMergedMedDoseLogsLastNDays(days: number): Promise<MedDoseLog[]> {
  return listMedDoseLogsForInsights(days);
}

/**
 * Per-medication merged dose logs for detail screens — same merge policy as insights
 * (`mergeMedDoseLogsForInsights`), so offline-first rows remain visible after replay.
 */
export async function listMedDoseLogsMergedForMedLastNDays(medId: string, days = 30): Promise<MedDoseLog[]> {
  const merged = await listMedDoseLogsForInsights(days);
  return merged.filter((l) => l.med_id === medId);
}

// -------------------------
// Medication events (normalized, remote first)
// -------------------------
export type MedicationEvent = {
  id: string;
  taken_at?: string | null;
  scheduled_for?: string | null;
  status: 'taken' | 'missed' | 'skipped';
};

// Prefer merged insight path (local + remote); mood hints stay consistent offline.
export async function listMedicationEvents(days = 30): Promise<MedicationEvent[]> {
  try {
    const merged = await listMedDoseLogsForInsights(days);
    return merged.map((r) => ({
      id: r.id,
      taken_at: r.taken_at ?? null,
      scheduled_for: (r as any).scheduled_for ?? null,
      status: r.status,
    }));
  } catch (e) {
    console.warn('listMedicationEvents: merged failed, falling back to remote:', e);
  }

  try {
    const remote = await listMedDoseLogsRemoteLastNDays(days);
    return (remote ?? []).map((r) => ({
      id: r.id,
      taken_at: r.taken_at ?? null,
      scheduled_for: (r as any).scheduled_for ?? null,
      status: r.status,
    }));
  } catch (e) {
    console.warn('listMedicationEvents: remote failed, falling back to local logs:', e);
  }

  try {
    const local = await listMedDoseLogsLastNDays(days);
    return (local ?? []).map((r) => ({
      id: r.id,
      taken_at: r.taken_at ?? null,
      scheduled_for: (r as any).scheduled_for ?? null,
      status: r.status,
    }));
  } catch (e) {
    console.warn('listMedicationEvents: local failed:', e);
    return [];
  }
}

// ============================================================================
// ✅ Insight feedback (NEW) — used by InsightCard.tsx
// ============================================================================

// ============================================================================
// ✅ Insight feedback — used by InsightCard.tsx + insights engine suppression
// ============================================================================

export const INSIGHT_FEEDBACK_REASONS = [
  'not_accurate',
  'not_relevant_now',
  'too_generic',
  'already_doing_this',
  'dont_like_suggestion',
  'confusing',
  'other',
] as const;

export type InsightFeedbackReason = (typeof INSIGHT_FEEDBACK_REASONS)[number];

export const INSIGHT_FEEDBACK_REASON_LABELS: Record<InsightFeedbackReason, string> = {
  not_accurate: 'Not accurate',
  not_relevant_now: 'Not relevant now',
  too_generic: 'Too generic',
  already_doing_this: 'Already doing this',
  dont_like_suggestion: "Don't like it",
  confusing: 'Confusing',
  other: 'Other',
};

export type InsightFeedbackRow = {
  id: string;
  user_id: string;
  created_at: string;

  insight_id: string;
  source_tag?: string | null;

  helpful: boolean;
  reason?: string | null;

  match_payload?: Record<string, any> | null; // jsonb
  app_version?: string | null;
};

// For engine lookups (fast)
export type InsightFeedbackLatest = {
  insight_id: string;
  created_at: string;
  helpful: boolean;
  reason?: string | null;
  source_tag?: string | null;
  // keep match_payload optional for future (e.g., contextFingerprint suppression)
  match_payload?: Record<string, any> | null;
};

export type InsightFeedbackLatestIndex = Record<string, InsightFeedbackLatest>;

export async function logInsightFeedback(input: {
  insight_id: string; // REQUIRED by DB
  source_tag?: string | null;

  helpful: boolean; // REQUIRED by DB
  reason?: InsightFeedbackReason | string | null;

  match_payload?: Record<string, any> | null; // jsonb
  app_version?: string | null;
}): Promise<InsightFeedbackRow> {
  const user = await requireUser();

  if (!input.insight_id || !String(input.insight_id).trim()) {
    throw new Error('logInsightFeedback: insight_id is required');
  }

  // ✅ normalize match_payload so the engine can evolve without breaking analytics
  const payloadObj = input.match_payload ?? null;

  // Pull fingerprint from explain if present
  const contextFingerprint =
    payloadObj && typeof payloadObj === 'object'
      ? (payloadObj as any)?.explain?.contextFingerprint ?? (payloadObj as any)?.contextFingerprint ?? null
      : null;

  const payload = {
    user_id: user.id,
    insight_id: String(input.insight_id),
    source_tag: input.source_tag ?? null,
    helpful: !!input.helpful,
    reason: input.reason ?? null,
    match_payload: payloadObj,
    app_version: input.app_version ?? null,

    // IMPORTANT: only include this if your DB has a column for it.
    // If it doesn't, the insert will fail — so we keep it OUT for now.
    // We'll add it as a DB migration in a later step (optional).
    // context_fingerprint: contextFingerprint,
  };

  const { data, error } = await supabase.from('insight_feedback').insert(payload).select('*').single();

  if (error) throw new Error(error.message);
  return data as InsightFeedbackRow;
}

export async function updateInsightFeedback(
  id: string,
  patch: {
    reason?: InsightFeedbackReason | string | null;
    app_version?: string | null;
    match_payload?: Record<string, any> | null;
  },
): Promise<InsightFeedbackRow> {
  const user = await requireUser();

  if (!id || !String(id).trim()) {
    throw new Error('updateInsightFeedback: id is required');
  }

  const payload: any = {};
  if ('reason' in patch) payload.reason = patch.reason ?? null;
  if ('app_version' in patch) payload.app_version = patch.app_version ?? null;
  if ('match_payload' in patch) payload.match_payload = patch.match_payload ?? null;

  if (!Object.keys(payload).length) {
    const { data, error } = await supabase
      .from('insight_feedback')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (error) throw new Error(error.message);
    return data as InsightFeedbackRow;
  }

  const { data, error } = await supabase
    .from('insight_feedback')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as InsightFeedbackRow;
}

/**
 * Raw list (debug / analytics).
 */
export async function listInsightFeedback(limit = 50): Promise<InsightFeedbackRow[]> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('insight_feedback')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as InsightFeedbackRow[];
}

/**
 * Latest feedback per insight_id for current user.
 *
 * Why client-side reduce?
 * - avoids needing SQL RPC/function right now
 * - still gives you O(1) lookups in the engine/provider
 *
 * Note: `fetchLimit` should be "big enough" to cover the variety of insight_ids a user might have seen.
 * 200–500 is usually fine because rows are tiny.
 */
export async function listLatestInsightFeedback(fetchLimit = 250): Promise<{
  latestByInsightId: InsightFeedbackLatestIndex;
  rows: InsightFeedbackRow[];
}> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('insight_feedback')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as InsightFeedbackRow[];

  const latestByInsightId: InsightFeedbackLatestIndex = {};
  for (const r of rows) {
    const key = String(r.insight_id ?? '').trim();
    if (!key) continue;

    // rows are ordered newest → oldest, so first time we see an insight_id is the latest
    if (!latestByInsightId[key]) {
      latestByInsightId[key] = {
        insight_id: key,
        created_at: r.created_at,
        helpful: !!r.helpful,
        reason: r.reason ?? null,
        source_tag: r.source_tag ?? null,
        match_payload: (r.match_payload ?? null) as any,
      };
    }
  }

  return { latestByInsightId, rows };
}

// ============================================================================
// Training Module
// ============================================================================

export type TrainingSessionRow = {
  id: string;
  user_id: string;
  started_at: string | null;
  ended_at: string | null;
  mode: 'timed' | 'manual';
  goals: Record<string, number>;
  summary: Record<string, any> | null;
  decision_trace: Record<string, any> | null;
  created_at: string;
  current_exercise_index: number;
  phase: 'work' | 'rest';
  rest_started_at: string | null;
  rest_ends_at: string | null;
};

export type TrainingSessionItemRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  order_index: number;
  planned: {
    sets: Array<{
      setIndex: number;
      targetReps: number;
      suggestedWeight: number;
      restSeconds: number;
    }>;
    priority: string;
    intents: string[];
    decisionTrace: Record<string, any>;
  };
  performed: {
    sets: Array<{
      setIndex: number;
      weight: number;
      reps: number;
      rpe?: number;
      completedAt: string;
    }>;
  } | null;
  autoregulation_adjustments: Record<number, {
    weightDelta: number;
    repsDelta: number;
    reason: string;
    appliedAt: string;
  }> | null;
  skipped: boolean;
  created_at: string;
};

export type TrainingSetLogRow = {
  id: string;
  session_item_id: string;
  set_index: number;
  weight: number | null;
  reps: number;
  rpe: number | null;
  exercise_id: string | null;
  completed_at: string;
  created_at: string;
};

/**
 * Create a new training session
 */
export async function createTrainingSession(input: {
  id: string;
  mode: 'timed' | 'manual';
  goals: Record<string, number>;
  startedAt?: string;
  programId?: string;
  programDayId?: string;
  weekIndex?: number;
  dayIndex?: number;
  sessionTypeLabel?: string;
}): Promise<TrainingSessionRow> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      id: input.id,
      user_id: user.id,
      started_at: input.startedAt || new Date().toISOString(),
      ended_at: null,
      mode: input.mode,
      goals: input.goals,
      summary: null,
      decision_trace: null,
      program_id: input.programId || null,
      program_day_id: input.programDayId || null,
      week_index: input.weekIndex || null,
      day_index: input.dayIndex || null,
      session_type_label: input.sessionTypeLabel || null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as TrainingSessionRow;
}

/**
 * Update training session (end time, summary, etc.)
 */
export async function updateTrainingSession(
  id: string,
  updates: {
    endedAt?: string;
    summary?: Record<string, any>;
    decisionTrace?: Record<string, any>;
  },
): Promise<TrainingSessionRow> {
  const user = await requireUser();

  const payload: any = {};
  if (updates.endedAt !== undefined) payload.ended_at = updates.endedAt;
  if (updates.summary !== undefined) payload.summary = updates.summary;
  if (updates.decisionTrace !== undefined) payload.decision_trace = updates.decisionTrace;

  const { data, error } = await supabase
    .from('training_sessions')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as TrainingSessionRow;
}

/**
 * Delete a training session and all associated data (set logs, items, checkins)
 * WARNING: This permanently deletes all data for the session. Use with caution.
 */
export async function deleteTrainingSession(id: string): Promise<void> {
  const user = await requireUser();

  // First, get all session items to delete their set logs
  const { data: items, error: itemsError } = await supabase
    .from('training_session_items')
    .select('id')
    .eq('session_id', id);

  if (itemsError) throw new Error(itemsError.message);

  const itemIds = (items ?? []).map((item) => item.id);

  // Delete set logs for all items in this session
  if (itemIds.length > 0) {
    const { error: logsError } = await supabase
      .from('training_set_logs')
      .delete()
      .in('session_item_id', itemIds);

    if (logsError) throw new Error(`Failed to delete set logs: ${logsError.message}`);
  }

  // Delete post-session checkins
  const { error: checkinsError } = await supabase
    .from('training_post_session_checkins')
    .delete()
    .eq('session_id', id);

  if (checkinsError) throw new Error(`Failed to delete checkins: ${checkinsError.message}`);

  // Delete session items
  const { error: itemsDeleteError } = await supabase
    .from('training_session_items')
    .delete()
    .eq('session_id', id);

  if (itemsDeleteError) throw new Error(`Failed to delete session items: ${itemsDeleteError.message}`);

  // Finally, delete the session itself
  const { error: sessionError } = await supabase
    .from('training_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (sessionError) throw new Error(`Failed to delete session: ${sessionError.message}`);
}

/**
 * List training sessions for user
 */
/**
 * Lists recent sessions from Supabase (plus durable cache on fetch failure).
 * Does not read or write guided-training buffers / set-completion queues — those stay separate.
 */
export async function listTrainingSessions(limit = 30): Promise<TrainingSessionRow[]> {
  const user = await requireUser();
  const cacheKey = readCacheKeys.trainingSessions(limit);
  try {
    const { data, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as TrainingSessionRow[];
    await saveReadCache(user.id, cacheKey, rows);
    return rows;
  } catch (e) {
    const cached = await loadReadCache<TrainingSessionRow[]>(user.id, cacheKey);
    if (cached && Array.isArray(cached)) return cached;
    throw e;
  }
}

/**
 * Get a single training session with items
 */
export async function getTrainingSession(id: string): Promise<{
  session: TrainingSessionRow;
  items: TrainingSessionItemRow[];
}> {
  const user = await requireUser();

  const { data: session, error: sessionError } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (sessionError) throw new Error(sessionError.message);

  const { data: items, error: itemsError } = await supabase
    .from('training_session_items')
    .select('*')
    .eq('session_id', id)
    .order('order_index', { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  return {
    session: session as TrainingSessionRow,
    items: (items ?? []) as TrainingSessionItemRow[],
  };
}

/**
 * Fetch a single training session item if it belongs to the current user.
 */
export async function getTrainingSessionItemById(itemId: string): Promise<TrainingSessionItemRow | null> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('training_session_items')
    .select('*, training_sessions!inner(user_id)')
    .eq('id', itemId)
    .eq('training_sessions.user_id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { training_sessions: _trainingSessions, ...item } = data as any;
  return item as TrainingSessionItemRow;
}

/**
 * Create training session items (from plan)
 */
export async function createTrainingSessionItems(
  sessionId: string,
  items: Array<{
    id: string;
    exerciseId: string;
    orderIndex: number;
    planned: {
      sets: Array<{
        setIndex: number;
        targetReps: number;
        suggestedWeight: number;
        restSeconds: number;
      }>;
      priority: string;
      intents: string[];
      decisionTrace: Record<string, any>;
    };
  }>,
): Promise<TrainingSessionItemRow[]> {
  const user = await requireUser();

  // Verify session belongs to user
  const { error: verifyError } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (verifyError) throw new Error('Session not found or access denied');

  const inserts = items.map((item) => ({
    id: item.id,
    session_id: sessionId,
    exercise_id: item.exerciseId,
    order_index: item.orderIndex,
    planned: item.planned,
    performed: null,
    skipped: false,
  }));

  const { data, error } = await supabase.from('training_session_items').insert(inserts).select('*');

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingSessionItemRow[];
}

/**
 * Update training session item (mark skipped, update performed sets)
 */
export async function updateTrainingSessionItem(
  itemId: string,
  updates: {
    skipped?: boolean;
    exercise_id?: string;
    performed?: {
      sets: Array<{
        setIndex: number;
        weight: number;
        reps: number;
        rpe?: number;
        completedAt: string;
      }>;
    };
    /** Full planned blob when swap needs to refresh intents / cues metadata. */
    planned?: TrainingSessionItemRow['planned'];
  },
): Promise<TrainingSessionItemRow> {
  const user = await requireUser();

  // Verify item belongs to user's session
  const { error: verifyError } = await supabase
    .from('training_session_items')
    .select('session_id, training_sessions!inner(user_id)')
    .eq('id', itemId)
    .single();

  if (verifyError) throw new Error('Item not found or access denied');

  const payload: any = {};
  if (updates.skipped !== undefined) payload.skipped = updates.skipped;
  if (updates.performed !== undefined) payload.performed = updates.performed;
  if (updates.exercise_id !== undefined) payload.exercise_id = updates.exercise_id;
  if (updates.planned !== undefined) payload.planned = updates.planned;

  const { data, error } = await supabase
    .from('training_session_items')
    .update(payload)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as TrainingSessionItemRow;
}

/**
 * Log a training set
 */
export async function logTrainingSet(input: {
  id: string;
  sessionItemId: string;
  setIndex: number;
  weight: number | null;
  reps: number;
  rpe?: number;
  completedAt?: string;
  exerciseId?: string;
}): Promise<TrainingSetLogRow> {
  const user = await requireUser();

  // Verify item belongs to user's session
  const { error: verifyError } = await supabase
    .from('training_session_items')
    .select('session_id, training_sessions!inner(user_id)')
    .eq('id', input.sessionItemId)
    .single();

  if (verifyError) throw new Error('Session item not found or access denied');

  const { data, error } = await supabase
    .from('training_set_logs')
    .insert({
      id: input.id,
      session_item_id: input.sessionItemId,
      set_index: input.setIndex,
      weight: input.weight,
      reps: input.reps,
      rpe: input.rpe || null,
      completed_at: input.completedAt || new Date().toISOString(),
      ...(input.exerciseId ? { exercise_id: input.exerciseId } : {}),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as TrainingSetLogRow;
}

export async function updateSessionCursorState(
  sessionId: string,
  updates: {
    current_exercise_index?: number;
    phase?: 'work' | 'rest';
    rest_started_at?: string | null;
    rest_ends_at?: string | null;
  }
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');
  const { error } = await supabase
    .from('training_sessions')
    .update(updates)
    .eq('id', sessionId)
    .eq('user_id', user.id);
  if (error) {
    logger.debug('[SESSION_CURSOR] updateSessionCursorState failed', { error, updates });
    throw error;
  }
  logger.debug('[SESSION_CURSOR] cursor updated', { sessionId, updates });
}

export async function updateItemAutoregulationAdjustments(
  sessionItemId: string,
  setIndex: number,
  adjustment: { weightDelta: number; repsDelta: number; reason: string }
): Promise<void> {
  const { data: item, error: readError } = await supabase
    .from('training_session_items')
    .select('autoregulation_adjustments')
    .eq('id', sessionItemId)
    .single();
  if (readError) {
    logger.debug('[SESSION_CURSOR] failed to read adjustments', { readError });
    throw readError;
  }
  const current = (item?.autoregulation_adjustments as Record<number, any>) ?? {};
  const updated = {
    ...current,
    [setIndex]: { ...adjustment, appliedAt: new Date().toISOString() },
  };
  const { error: writeError } = await supabase
    .from('training_session_items')
    .update({ autoregulation_adjustments: updated })
    .eq('id', sessionItemId);
  if (writeError) {
    logger.debug('[SESSION_CURSOR] failed to write adjustments', { writeError });
    throw writeError;
  }
  logger.debug('[SESSION_CURSOR] autoregulation adjustment saved', {
    sessionItemId, setIndex, adjustment
  });
}

/**
 * Update an existing training set log (weight, reps, rpe)
 */
export async function updateTrainingSetLog(
  id: string,
  updates: { weight?: number; reps?: number; rpe?: number | null },
): Promise<TrainingSetLogRow> {
  await requireUser();

  const { data: log, error: fetchError } = await supabase
    .from('training_set_logs')
    .select('session_item_id')
    .eq('id', id)
    .single();

  if (fetchError || !log) throw new Error('Set log not found');

  // Verify session item belongs to user
  const { error: verifyError } = await supabase
    .from('training_session_items')
    .select('session_id, training_sessions!inner(user_id)')
    .eq('id', log.session_item_id)
    .single();

  if (verifyError) throw new Error('Access denied');

  const payload: Record<string, any> = {};
  if (updates.weight !== undefined) payload.weight = updates.weight;
  if (updates.reps !== undefined) payload.reps = updates.reps;
  if (updates.rpe !== undefined) payload.rpe = updates.rpe;

  const { data, error } = await supabase
    .from('training_set_logs')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as TrainingSetLogRow;
}

/**
 * Get set logs for a session item
 */
export async function getTrainingSetLogs(sessionItemId: string): Promise<TrainingSetLogRow[]> {
  const user = await requireUser();

  // Verify item belongs to user's session
  const { error: verifyError } = await supabase
    .from('training_session_items')
    .select('session_id, training_sessions!inner(user_id)')
    .eq('id', sessionItemId)
    .single();

  if (verifyError) throw new Error('Session item not found or access denied');

  const { data, error } = await supabase
    .from('training_set_logs')
    .select('*')
    .eq('session_item_id', sessionItemId)
    .order('set_index', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingSetLogRow[];
}

/**
 * Get last performance for an exercise (for progression)
 */
export async function getLastExercisePerformance(exerciseId: string): Promise<{
  exerciseId: string;
  sets: Array<{
    setIndex: number;
    weight: number;
    reps: number;
    rpe?: number;
    completedAt: string;
  }>;
  date: string;
} | null> {
  const user = await requireUser();

  // Find most recent session item with this exercise
  const { data: item, error: itemError } = await supabase
    .from('training_session_items')
    .select('id, session_id, training_sessions!inner(started_at)')
    .eq('exercise_id', exerciseId)
    .eq('training_sessions.user_id', user.id)
    .not('performed', 'is', null)
    .order('training_sessions.started_at', { ascending: false })
    .limit(1)
    .single();

  if (itemError || !item) return null;

  const { data: logs, error: logsError } = await supabase
    .from('training_set_logs')
    .select('*')
    .eq('session_item_id', item.id)
    .order('set_index', { ascending: true });

  if (logsError || !logs || logs.length === 0) return null;

  const session = item.training_sessions as any;

  return {
    exerciseId,
    sets: logs.map((log) => ({
      setIndex: log.set_index,
      weight: log.weight || 0,
      reps: log.reps,
      rpe: log.rpe || undefined,
      completedAt: log.completed_at,
    })),
    date: session.started_at,
  };
}

/**
 * Get last performance for multiple exercises (batch query for efficiency)
 */
export async function getLastExercisePerformances(exerciseIds: string[]): Promise<Record<string, {
  exerciseId: string;
  sets: Array<{
    setIndex: number;
    weight: number;
    reps: number;
    rpe?: number;
    completedAt: string;
  }>;
  date: string;
}>> {
  const user = await requireUser();
  const result: Record<string, any> = {};

  if (exerciseIds.length === 0) return result;

  // Get most recent session item for each exercise
  const { data: items, error: itemsError } = await supabase
    .from('training_session_items')
    .select('id, exercise_id, session_id, training_sessions!inner(started_at, user_id)')
    .in('exercise_id', exerciseIds)
    .eq('training_sessions.user_id', user.id)
    .not('performed', 'is', null);

  if (itemsError || !items || items.length === 0) return result;

  // Group by exercise_id and get most recent for each
  const byExercise: Record<string, any> = {};
  for (const item of items) {
    const exId = item.exercise_id;
    const session = (item.training_sessions as any);
    const startedAt = session.started_at;
    if (!byExercise[exId] || startedAt > byExercise[exId].started_at) {
      byExercise[exId] = { itemId: item.id, startedAt };
    }
  }

  // Fetch logs for all items
  const itemIds = Object.values(byExercise).map((v) => v.itemId);
  const { data: logs, error: logsError } = await supabase
    .from('training_set_logs')
    .select('*')
    .in('session_item_id', itemIds)
    .order('set_index', { ascending: true });

  if (logsError || !logs) return result;

  // Group logs by session_item_id
  const logsByItem: Record<string, any[]> = {};
  for (const log of logs) {
    const itemId = log.session_item_id;
    if (!logsByItem[itemId]) logsByItem[itemId] = [];
    logsByItem[itemId].push(log);
  }

  // Build result
  for (const [exId, { itemId, startedAt }] of Object.entries(byExercise)) {
    const exerciseLogs = logsByItem[itemId] || [];
    if (exerciseLogs.length > 0) {
      result[exId] = {
        exerciseId: exId,
        sets: exerciseLogs.map((log) => ({
          setIndex: log.set_index,
          weight: log.weight || 0,
          reps: log.reps,
          rpe: log.rpe || undefined,
          completedAt: log.completed_at,
        })),
        date: startedAt,
      };
    }
  }

  return result;
}

/**
 * Get recent per-session performances for multiple exercises (newest first).
 * Powers double-progression hold-streak / deload detection.
 */
export async function getRecentExercisePerformances(
  exerciseIds: string[],
  sessionsPerExercise = 3,
): Promise<Record<string, Array<{
  exerciseId: string;
  sets: Array<{
    setIndex: number;
    weight: number;
    reps: number;
    rpe?: number;
    completedAt: string;
  }>;
  date: string;
}>>> {
  const user = await requireUser();
  const result: Record<string, Array<any>> = {};

  if (exerciseIds.length === 0) return result;

  const { data: items, error: itemsError } = await supabase
    .from('training_session_items')
    .select('id, exercise_id, session_id, training_sessions!inner(started_at, user_id, ended_at)')
    .in('exercise_id', exerciseIds)
    .eq('training_sessions.user_id', user.id)
    .not('performed', 'is', null);

  if (itemsError || !items || items.length === 0) return result;

  // Keep the N most recent items per exercise
  const byExercise: Record<string, Array<{ itemId: string; startedAt: string }>> = {};
  for (const item of items) {
    const exId = item.exercise_id;
    const session = item.training_sessions as any;
    if (!byExercise[exId]) byExercise[exId] = [];
    byExercise[exId].push({ itemId: item.id, startedAt: session.started_at });
  }
  for (const exId of Object.keys(byExercise)) {
    byExercise[exId].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
    byExercise[exId] = byExercise[exId].slice(0, sessionsPerExercise);
  }

  const itemIds = Object.values(byExercise).flatMap((arr) => arr.map((v) => v.itemId));
  const { data: logs, error: logsError } = await supabase
    .from('training_set_logs')
    .select('*')
    .in('session_item_id', itemIds)
    .order('set_index', { ascending: true });

  if (logsError || !logs) return result;

  const logsByItem: Record<string, any[]> = {};
  for (const log of logs) {
    const itemId = log.session_item_id;
    if (!logsByItem[itemId]) logsByItem[itemId] = [];
    logsByItem[itemId].push(log);
  }

  for (const [exId, entries] of Object.entries(byExercise)) {
    const sessions = entries
      .map(({ itemId, startedAt }) => {
        const exerciseLogs = logsByItem[itemId] || [];
        if (exerciseLogs.length === 0) return null;
        return {
          exerciseId: exId,
          sets: exerciseLogs.map((log) => ({
            setIndex: log.set_index,
            weight: log.weight || 0,
            reps: log.reps,
            rpe: log.rpe || undefined,
            completedAt: log.completed_at,
          })),
          date: startedAt,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
    if (sessions.length > 0) result[exId] = sessions;
  }

  return result;
}

/**
 * Get best performance metrics for an exercise (for PR detection)
 */
export async function getExerciseBestPerformance(exerciseId: string): Promise<{
  bestWeight?: number;
  bestReps?: number;
  bestE1RM?: number;
  bestVolume?: number;
} | null> {
  const user = await requireUser();

  // Get all session items for this exercise
  const { data: items, error: itemsError } = await supabase
    .from('training_session_items')
    .select('id, training_sessions!inner(user_id)')
    .eq('exercise_id', exerciseId)
    .eq('training_sessions.user_id', user.id)
    .not('performed', 'is', null);

  if (itemsError || !items || items.length === 0) return null;

  const itemIds = items.map((i) => i.id);
  const { data: logs, error: logsError } = await supabase
    .from('training_set_logs')
    .select('weight, reps, session_item_id')
    .in('session_item_id', itemIds);

  if (logsError || !logs || logs.length === 0) return null;

  // Compute bests
  const bestWeight = Math.max(...logs.map((l) => l.weight || 0));
  const bestReps = Math.max(...logs.map((l) => l.reps));
  
  // Compute best e1RM (using Epley: weight * (1 + reps/30))
  const e1RMs = logs.map((l) => {
    if (l.reps <= 0 || l.weight <= 0) return 0;
    if (l.reps === 1) return l.weight;
    return l.weight * (1 + l.reps / 30);
  });
  const bestE1RM = Math.max(...e1RMs);

  // Compute best volume (sum of weight * reps for a session)
  const volumeByItem: Record<string, number> = {};
  for (const log of logs) {
    const itemId = log.session_item_id;
    volumeByItem[itemId] = (volumeByItem[itemId] || 0) + (log.weight || 0) * log.reps;
  }
  const bestVolume = Math.max(...Object.values(volumeByItem));

  return {
    bestWeight: bestWeight > 0 ? bestWeight : undefined,
    bestReps: bestReps > 0 ? bestReps : undefined,
    bestE1RM: bestE1RM > 0 ? bestE1RM : undefined,
    bestVolume: bestVolume > 0 ? bestVolume : undefined,
  };
}

// ============================================================================
// Training Profiles API
// ============================================================================

export type TrainingProfileRow = {
  id: string;
  user_id: string;
  goals: Record<string, number>;
  days_per_week: number;
  preferred_time_window: {
    morning?: boolean;
    evening?: boolean;
    startRange?: number;
    endRange?: number;
  };
  equipment_access: string[];
  constraints: {
    injuries?: string[];
    forbiddenMovements?: string[];
    preferences?: Record<string, any>;
  };
  baselines?: Record<string, number>;
  created_at: string;
  updated_at: string;
};

/**
 * Get user's training profile
 */
export async function getTrainingProfile(): Promise<TrainingProfileRow | null> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('training_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }

  return data as TrainingProfileRow;
}

/**
 * Create or update training profile
 */
export async function upsertTrainingProfile(profile: {
  goals: Record<string, number>;
  days_per_week: number;
  preferred_time_window?: {
    morning?: boolean;
    evening?: boolean;
    startRange?: number;
    endRange?: number;
  };
  equipment_access: string[];
  constraints?: {
    injuries?: string[];
    forbiddenMovements?: string[];
    preferences?: Record<string, any>;
  };
  baselines?: Record<string, number>;
}): Promise<TrainingProfileRow> {
  const user = await requireUser();

  const payload = {
    user_id: user.id,
    goals: profile.goals,
    days_per_week: profile.days_per_week,
    preferred_time_window: profile.preferred_time_window || {},
    equipment_access: profile.equipment_access,
    constraints: profile.constraints || {},
    baselines: profile.baselines || {},
  };

  const { data, error } = await supabase
    .from('training_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TrainingProfileRow;
}

/**
 * Delete training profile
 */
export async function deleteTrainingProfile(): Promise<void> {
  const user = await requireUser();

  const { error } = await supabase.from('training_profiles').delete().eq('user_id', user.id);

  if (error) throw new Error(error.message);
}

/**
 * Delete entire program plan (instances, program days, profile) so user can start from scratch.
 */
export async function deleteProgramPlan(): Promise<void> {
  const user = await requireUser();

  const instances = await getProgramInstances();
  const instanceIds = instances.map((i) => i.id);
  if (instanceIds.length > 0) {
    const { error: daysError } = await supabase
      .from('training_program_days')
      .delete()
      .in('program_id', instanceIds)
      .eq('user_id', user.id);
    if (daysError) throw new Error(daysError.message);
  }

  const { error: instancesError } = await supabase
    .from('training_program_instances')
    .delete()
    .eq('user_id', user.id);
  if (instancesError) throw new Error(instancesError.message);

  const { error: profileError } = await supabase
    .from('training_profiles')
    .delete()
    .eq('user_id', user.id);
  if (profileError) throw new Error(profileError.message);

  logger.debug('[deleteProgramPlan] Deleted program plan for user', { userId: user.id });
}

// ============================================================================
// Training Events API
// ============================================================================

export type TrainingEventRow = {
  id: string;
  user_id: string;
  event_name: string;
  payload: Record<string, any>;
  created_at: string;
};

/**
 * Log a training event
 */
export async function logTrainingEvent(
  eventName: string,
  payload: Record<string, any> = {},
): Promise<void> {
  const user = await requireUser();

  // Ensure payload is serializable and small (use JSON.stringify with error handling)
  let safePayload: any = {};
  try {
    safePayload = JSON.parse(JSON.stringify(payload));
  } catch {
    // If serialization fails, use empty object
    safePayload = {};
  }

  const { error } = await supabase.from('training_events').insert({
    user_id: user.id,
    event_name: eventName,
    payload: safePayload,
  });

  if (error) {
    // Don't throw - events are non-critical
    logger.warn('Failed to log training event', { eventName, error: error.message });
  }
}

/**
 * Get training events for user (for analytics/dropoff detection)
 */
export async function getTrainingEvents(
  eventName?: string,
  limit = 100,
): Promise<TrainingEventRow[]> {
  const user = await requireUser();

  let query = supabase
    .from('training_events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (eventName) {
    query = query.eq('event_name', eventName);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingEventRow[];
}

// ========================================
// TRAINING PROGRAM LAYER
// ========================================

export type ProgramInstanceRow = {
  id: string;
  user_id: string;
  start_date: string;
  duration_weeks: number;
  selected_weekdays: number[];
  plan: any; // JSONB
  profile_snapshot: any; // JSONB
  status: string;
  created_at: string;
  updated_at: string;
};

export type ProgramDayRow = {
  id: string;
  program_id: string;
  user_id: string;
  date: string;
  week_index: number;
  day_index: number;
  label: string;
  intents: any; // JSONB
  template_key: string;
  created_at: string;
};

export type PostSessionCheckinRow = {
  id: string;
  user_id: string;
  session_id: string;
  felt: string;
  note: string | null;
  created_at: string;
};

/**
 * Create a new program instance
 */
export async function createProgramInstance(program: {
  start_date: string;
  duration_weeks: number;
  selected_weekdays: number[];
  plan: any;
  profile_snapshot: any;
  status?: string;
}): Promise<ProgramInstanceRow> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('training_program_instances')
    .insert({
      user_id: user.id,
      ...program,
      status: program.status || 'active',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as ProgramInstanceRow;
}

/**
 * Get program instances for user
 */
export async function getProgramInstances(
  status?: 'active' | 'completed' | 'abandoned',
): Promise<ProgramInstanceRow[]> {
  const user = await requireUser();

  let query = supabase
    .from('training_program_instances')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as ProgramInstanceRow[];
}

/**
 * Get active program instance for user
 */
export async function getActiveProgramInstance(): Promise<ProgramInstanceRow | null> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('training_program_instances')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ProgramInstanceRow | null;
}

/**
 * Update program instance
 */
export async function updateProgramInstance(
  programId: string,
  updates: Partial<ProgramInstanceRow>,
): Promise<ProgramInstanceRow> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('training_program_instances')
    .update(updates)
    .eq('id', programId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as ProgramInstanceRow;
}

/**
 * Create program days (bulk insert)
 * CRITICAL: Do NOT include `id` in inserts - DB generates UUIDs
 */
export async function createProgramDays(
  days: Array<{
    program_id: string;
    date: string;
    week_index: number;
    day_index: number;
    label: string;
    intents: any;
    template_key: string;
  }>,
): Promise<ProgramDayRow[]> {
  const user = await requireUser();

  // Explicitly construct insert payload WITHOUT `id` field
  const inserts = days.map((day) => ({
    program_id: day.program_id,
    user_id: user.id,
    date: day.date,
    week_index: day.week_index,
    day_index: day.day_index,
    label: day.label,
    intents: day.intents,
    template_key: day.template_key,
    // NO `id` - let DB generate UUID
  }));

  const { data, error } = await supabase.from('training_program_days').insert(inserts).select('*');

  if (error) throw new Error(error.message);
  return (data ?? []) as ProgramDayRow[];
}
/**
 * Get program day by date
 */
export async function getProgramDayByDate(date: string): Promise<ProgramDayRow | null> {
  const user = await requireUser();

  const { data, error} = await supabase
    .from('training_program_days')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ProgramDayRow | null;
}

/**
 * Create post-session check-in
 */
export async function createPostSessionCheckin(
  sessionId: string,
  felt: string,
  note?: string,
): Promise<PostSessionCheckinRow> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('training_post_session_checkins')
    .insert({
      user_id: user.id,
      session_id: sessionId,
      felt,
      note: note || null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as PostSessionCheckinRow;
}

/**
 * Get post-session check-in for a session
 */
export async function getPostSessionCheckin(sessionId: string): Promise<PostSessionCheckinRow | null> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('training_post_session_checkins')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PostSessionCheckinRow | null;
}
export async function getProgramDays(
  programId: string,
  startDate?: string,
  endDate?: string,
): Promise<ProgramDayRow[]> {
  const user = await requireUser();

  let query = supabase
    .from('training_program_days')
    .select('*')
    .eq('program_id', programId)
    .eq('user_id', user.id)
    .order('date', { ascending: true });

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as ProgramDayRow[];
}

// ============================================================================
// Training Analytics API
// ============================================================================

/**
 * Get all set logs for an exercise (for trend analysis)
 */
export async function listSetLogsByExercise(
  exerciseId: string,
  options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  },
): Promise<Array<{
  id: string;
  exerciseId: string;
  weight: number;
  reps: number;
  rpe: number | null;
  completedAt: string;
  sessionId: string;
}>> {
  const user = await requireUser();
  
  // First get all session items for this exercise
  let itemsQuery = supabase
    .from('training_session_items')
    .select('id, session_id, training_sessions!inner(user_id, started_at)')
    .eq('exercise_id', exerciseId)
    .eq('training_sessions.user_id', user.id);
  
  if (options?.startDate) {
    itemsQuery = itemsQuery.gte('training_sessions.started_at', options.startDate);
  }
  if (options?.endDate) {
    itemsQuery = itemsQuery.lte('training_sessions.started_at', options.endDate);
  }
  
  const { data: items, error: itemsError } = await itemsQuery;
  
  if (itemsError) throw new Error(itemsError.message);
  if (!items || items.length === 0) return [];
  
  const itemIds = items.map(i => i.id);
  const sessionMap: Record<string, string> = {};
  items.forEach(i => { sessionMap[i.id] = i.session_id; });
  
  // Get set logs for these items
  let logsQuery = supabase
    .from('training_set_logs')
    .select('*')
    .in('session_item_id', itemIds)
    .order('completed_at', { ascending: false });
  
  if (options?.limit) {
    logsQuery = logsQuery.limit(options.limit);
  }
  
  const { data: logs, error: logsError } = await logsQuery;
  
  if (logsError) throw new Error(logsError.message);
  
  return (logs ?? []).map((log: any) => ({
    id: log.id,
    exerciseId,
    weight: log.weight || 0,
    reps: log.reps,
    rpe: log.rpe,
    completedAt: log.completed_at,
    sessionId: sessionMap[log.session_item_id] || '',
  }));
}

/**
 * Get all set logs for multiple sessions (batch query)
 */
export async function listSetLogsBySessions(
  sessionIds: string[],
): Promise<Array<{
  id: string;
  sessionItemId: string;
  sessionId: string;
  exerciseId: string;
  weight: number;
  reps: number;
  rpe: number | null;
  completedAt: string;
}>> {
  const user = await requireUser();
  
  if (sessionIds.length === 0) return [];
  
  // Get all items for these sessions
  const { data: items, error: itemsError } = await supabase
    .from('training_session_items')
    .select('id, session_id, exercise_id, training_sessions!inner(user_id)')
    .in('session_id', sessionIds)
    .eq('training_sessions.user_id', user.id);
  
  if (itemsError) throw new Error(itemsError.message);
  if (!items || items.length === 0) return [];
  
  const itemIds = items.map(i => i.id);
  const itemMap: Record<string, { sessionId: string; exerciseId: string }> = {};
  items.forEach(i => { 
    itemMap[i.id] = { sessionId: i.session_id, exerciseId: i.exercise_id }; 
  });
  
  // Get set logs for these items
  const { data: logs, error: logsError } = await supabase
    .from('training_set_logs')
    .select('*')
    .in('session_item_id', itemIds)
    .order('completed_at', { ascending: true });
  
  if (logsError) throw new Error(logsError.message);
  
  return (logs ?? []).map((log: any) => ({
    id: log.id,
    sessionItemId: log.session_item_id,
    sessionId: itemMap[log.session_item_id]?.sessionId || '',
    exerciseId: itemMap[log.session_item_id]?.exerciseId || '',
    weight: log.weight || 0,
    reps: log.reps,
    rpe: log.rpe,
    completedAt: log.completed_at,
  }));
}

/**
 * Get session summaries for analytics (last N sessions)
 */
export async function listSessionSummaries(
  limit: number = 30,
): Promise<Array<{
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  totalVolume: number;
  totalSets: number;
  exercisesCompleted: number;
  exercisesSkipped: number;
  averageRpe: number | null;
  prs: any[];
}>> {
  const user = await requireUser();
  
  const { data: sessions, error: sessionsError } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);
  
  if (sessionsError) throw new Error(sessionsError.message);
  if (!sessions || sessions.length === 0) return [];
  
  return sessions.map((s: any) => {
    const summary = s.summary || {};
    const startedAt = s.started_at ? new Date(s.started_at) : null;
    const endedAt = s.ended_at ? new Date(s.ended_at) : null;
    
    return {
      sessionId: s.id,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      durationMinutes: startedAt && endedAt 
        ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 60000)
        : summary.durationMinutes ?? null,
      totalVolume: summary.totalVolume ?? 0,
      totalSets: summary.totalSets ?? 0,
      exercisesCompleted: summary.exercisesCompleted ?? 0,
      exercisesSkipped: summary.exercisesSkipped ?? 0,
      averageRpe: summary.averageRpe ?? null,
      prs: summary.prs ?? [],
    };
  });
}

/**
 * Get exercise history with context (for detailed analytics)
 */
export async function getExerciseHistory(
  exerciseId: string,
  limit: number = 20,
): Promise<Array<{
  sessionId: string;
  sessionDate: string;
  sessionLabel?: string;
  sets: Array<{
    setIndex: number;
    weight: number;
    reps: number;
    rpe: number | null;
  }>;
  totalVolume: number;
  bestE1RM: number;
}>> {
  const user = await requireUser();
  
  // Get session items for this exercise
  const { data: items, error: itemsError } = await supabase
    .from('training_session_items')
    .select(`
      id, 
      session_id, 
      performed,
      training_sessions!inner(
        user_id, 
        started_at, 
        session_type_label
      )
    `)
    .eq('exercise_id', exerciseId)
    .eq('training_sessions.user_id', user.id)
    .not('performed', 'is', null)
    .order('training_sessions.started_at', { ascending: false })
    .limit(limit);
  
  if (itemsError) throw new Error(itemsError.message);
  if (!items || items.length === 0) return [];
  
  const itemIds = items.map(i => i.id);
  
  // Get set logs
  const { data: logs, error: logsError } = await supabase
    .from('training_set_logs')
    .select('*')
    .in('session_item_id', itemIds)
    .order('set_index', { ascending: true });
  
  if (logsError) throw new Error(logsError.message);
  
  // Group logs by item
  const logsByItem: Record<string, any[]> = {};
  for (const log of logs ?? []) {
    if (!logsByItem[log.session_item_id]) logsByItem[log.session_item_id] = [];
    logsByItem[log.session_item_id].push(log);
  }
  
  // Build result
  const result = items.map((item: any) => {
    const session = item.training_sessions;
    const itemLogs = logsByItem[item.id] || [];
    
    const sets = itemLogs.map((log: any) => ({
      setIndex: log.set_index,
      weight: log.weight || 0,
      reps: log.reps,
      rpe: log.rpe,
    }));
    
    const totalVolume = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
    
    // Compute best e1RM (Epley formula)
    const e1RMs = sets
      .filter(s => s.weight > 0 && s.reps > 0)
      .map(s => s.weight * (1 + s.reps / 30));
    const bestE1RM = e1RMs.length > 0 ? Math.max(...e1RMs) : 0;
    
    return {
      sessionId: item.session_id,
      sessionDate: session.started_at,
      sessionLabel: session.session_type_label || undefined,
      sets,
      totalVolume: Math.round(totalVolume),
      bestE1RM: Math.round(bestE1RM * 10) / 10,
    };
  });
  
  return result;
}