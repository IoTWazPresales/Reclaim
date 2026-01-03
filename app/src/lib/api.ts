// C:\Reclaim\app\src\lib\api.ts
// ✅ Updated: make ALL writes RLS-safe by explicitly setting user_id on inserts/upserts where needed,
// and by filtering reads by user_id consistently.
//
// ✅ Added: Insight feedback logging for InsightCard ("logInsightFeedback", "listInsightFeedback")

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HealthPlatform } from '@/lib/health/types';

// -------------------------
// Shared helpers
// -------------------------
async function requireUser() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');
  return user;
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

// ---------- Local day helpers (ZA) ----------
function ensureIntl(date: Date, tz: string) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fallback below
  }
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalDayDateZA(ts: Date = new Date()): string {
  return ensureIntl(ts, 'Africa/Johannesburg');
}

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

export async function insertEntry(entry: Omit<Entry, 'id' | 'user_id' | 'ts'>) {
  const user = await requireUser();

  const payload: any = {
    ...entry,
    user_id: user.id,
  };

  // If caller didn't include day_date, set it using ZA local date
  if (!payload.day_date) {
    payload.day_date = getLocalDayDateZA(new Date());
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

  const day_date = getLocalDayDateZA(new Date());
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
export type Med = {
  id?: string;
  user_id?: string;
  name: string;
  dose?: string;
  schedule?: { times: string[]; days: number[] }; // days: 1=Mon ... 7=Sun
  created_at?: string;
};

export async function listMeds(): Promise<Med[]> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('meds')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Med[];
}

export async function upsertMed(m: Omit<Med, 'id' | 'user_id' | 'created_at'> & { id?: string }) {
  const user = await requireUser();

  // ✅ Always attach user_id for RLS-safe upsert
  const payload: any = { ...m, user_id: user.id };

  const { data, error } = await supabase.from('meds').upsert(payload, { onConflict: 'id' }).select().single();
  if (error) throw new Error(error.message);
  return data as Med;
}

export async function deleteMed(id: string) {
  const user = await requireUser();

  const { error } = await supabase.from('meds').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

// ---- schedule parsing (generate upcoming reminder Date objects) ----

// helpers: 1=Mon ... 7=Sun (JS getDay(): 0=Sun -> map to 7)
function jsDayToPolicy(d: number) {
  return d === 0 ? 7 : d; // Sun(0) -> 7
}

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
};

const MOOD_KEY = '@reclaim/mood/v1';

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
  const rows = await listMood(1);
  return rows[0] ?? null;
}

export async function weekAverageMood(): Promise<number | null> {
  const now = new Date();
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rows = await listMood(500);
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
  ctx?: Record<string, any>;
  created_at?: string;
};

export async function listMoodCheckins(limit = 30): Promise<MoodCheckin[]> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as MoodCheckin[];
}

export async function listMoodCheckinsRange(startISO: string, endISO: string): Promise<MoodCheckin[]> {
  const user = await requireUser();

  const { data, error } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MoodCheckin[];
}

export async function addMoodCheckin(input: UpsertMoodInput): Promise<MoodCheckin> {
  const user = await requireUser();

  const createdAt = input.created_at ?? new Date().toISOString();
  const payload = {
    user_id: user.id,
    mood: input.mood,
    energy: input.energy ?? null,
    tags: input.tags ?? [],
    note: input.note ?? null,
    ctx: input.ctx ?? {},
    created_at: createdAt,
  };

  const { data, error } = await supabase.from('mood_checkins').insert(payload).select('*').single();
  if (error) throw error;

  // mirror into local storage (for offline/UI convenience)
  const moodEntry: MoodEntry = {
    id: data.id,
    rating: data.mood,
    note: data.note ?? undefined,
    created_at: data.created_at,
    tags: Array.isArray(data.tags) ? data.tags : undefined,
  };
  await upsertMood(moodEntry);

  // optional secondary table sync (ignore failures)
  try {
    await supabase.from('mood_entries').upsert(
      {
        id: data.id,
        user_id: user.id,
        rating: data.mood,
        note: data.note ?? null,
        created_at: data.created_at,
      },
      { onConflict: 'id' },
    );
  } catch (syncError) {
    console.warn('Failed to sync mood checkin to mood_entries:', syncError);
  }

  return data as MoodCheckin;
}

export async function deleteMoodCheckin(id: string): Promise<void> {
  const user = await requireUser();

  const { error } = await supabase.from('mood_checkins').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

// Did user log today? (same local day window)
export async function hasMoodToday(_localTZOffsetMinutes = 0): Promise<boolean> {
  const user = await requireUser();

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('mood_checkins')
    .select('id, created_at')
    .eq('user_id', user.id)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .limit(1);

  if (error) throw error;
  return (data ?? []).length > 0;
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
  const since = getLocalDayDateZA(start);

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
  const user = await requireUser();

  const ts = input.ts ?? new Date();
  const day_date = getLocalDayDateZA(ts);
  const tags = parseTags(input.note ?? '', input.tags);

  const row = {
    user_id: user.id,
    ts: ts.toISOString(),
    day_date,
    rating: input.rating,
    note: input.note ?? null,
    tags: tags.length ? tags : null,
    source: input.source ?? 'manual',
  };

  const { data, error } = await supabase.from('mood_checkins').insert(row).select('*').single();
  if (error) throw error;
  return data as any;
}

export async function listMoodCheckinsDays(days: number): Promise<MoodEntry[]> {
  const user = await requireUser();

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const since = getLocalDayDateZA(start);

  const { data, error } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('day_date', since)
    .order('ts', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    rating: row.rating,
    note: row.note ?? undefined,
    created_at: row.ts,
    tags: Array.isArray(row.tags) ? row.tags : undefined,
    day_date: row.day_date,
  }));
}

export async function listDailyMoodFromSupabase(days: number): Promise<MoodEntry[]> {
  const user = await requireUser();

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const since = getLocalDayDateZA(start);

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

  const { data, error } = await supabase
    .from('sleep_sessions')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', since.toISOString())
    .order('start_time', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SleepSession[];
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
  return data as SleepSession;
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

  if (input.durationMinutes !== undefined) row.duration_minutes = input.durationMinutes;
  if (input.efficiency !== undefined && input.efficiency !== null) row.efficiency = input.efficiency;
  if (stagesJSON && stagesJSON.length > 0) row.stages = stagesJSON;

  if (input.metadata) {
    const metadata = { ...input.metadata };
    if (metadata.bodyTemperature && !metadata.skinTemperature) {
      metadata.skinTemperature = metadata.bodyTemperature;
    }
    row.metadata = metadata;
  }

  const { data, error } = await supabase.from('sleep_sessions').upsert(row, { onConflict: 'id' }).select('id').single();

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
}

// -------------------------
// Activity + vitals daily
// -------------------------
export async function upsertDailyActivityFromHealth(input: {
  date: Date;
  steps?: number | null;
  activeEnergy?: number | null;
  source?: HealthPlatform | null;
}): Promise<void> {
  const user = await requireUser();

  const day = new Date(input.date);
  day.setHours(0, 0, 0, 0);
  const activityDate = day.toISOString().split('T')[0];

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

  const day = new Date(input.date);
  day.setHours(0, 0, 0, 0);
  const vitalsDate = day.toISOString().split('T')[0];

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
}

export type DailyActivitySummary = {
  id: string;
  user_id: string;
  activity_date: string;
  steps?: number | null;
  active_energy?: number | null;
  source?: HealthPlatform | null;
  created_at?: string;
};

export async function listDailyActivitySummaries(days = 14): Promise<DailyActivitySummary[]> {
  const user = await requireUser();

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('activity_daily')
    .select('*')
    .eq('user_id', user.id)
    .gte('activity_date', start.toISOString().slice(0, 10))
    .order('activity_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as DailyActivitySummary[];
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

const MEDITATION_KEY = '@reclaim/meditations/v1';

async function readMeditations(): Promise<MeditationSession[]> {
  const raw = await AsyncStorage.getItem(MEDITATION_KEY);
  return raw ? (JSON.parse(raw) as MeditationSession[]) : [];
}

async function writeMeditations(rows: MeditationSession[]) {
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

// Simple adherence calc: taken / scheduled
export function computeAdherence(logs: MedDoseLog[]) {
  const scheduled = logs.length;
  const taken = logs.filter((l) => l.status === 'taken').length;
  const pct = scheduled ? Math.round((taken / scheduled) * 100) : 0;
  return { scheduled, taken, pct };
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

// Prefer remote if available, fallback to local AsyncStorage logs.
// Normalizes to { taken_at, status } style events for Mood cause-hints.
export async function listMedicationEvents(days = 30): Promise<MedicationEvent[]> {
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
