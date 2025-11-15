import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HealthPlatform } from '@/lib/health/types';
export type Entry = {
  id?: string;
  user_id?: string;
  ts?: string;
  mood?: number;
  sleep_hours?: number;
  focus_minutes?: number;
  meds_taken?: boolean;
  note?: string;
};
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
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function insertEntry(entry: Omit<Entry, 'id' | 'user_id' | 'ts'>) {
  const { data, error } = await supabase
    .from('entries')
    .insert(entry)
    .select()
    .single();
  if (error) {
    // throw a plain Error so React Query shows readable message
    throw new Error(`${error.message} (${error.code ?? 'no-code'})`);
  }
  return data as Entry;
}

export async function listEntries(limit = 10) {
  // Explicitly filter by user to align with RLS and avoid surprises
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session/user — sign in first');

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', user.id)
    .order('ts', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`${error.message} (${error.code ?? 'no-code'})`);
  }
  return (data ?? []) as Entry[];
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

// Upsert "today" by checking if you already logged; if yes, update, else insert
export async function upsertTodayEntry(entry: {
  mood?: number; sleep_hours?: number; focus_minutes?: number; meds_taken?: boolean; note?: string;
}) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

  // find existing row for today
  const { data: existing, error: selErr } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('ts', startOfDay())
    .lte('ts', endOfDay())
    .order('ts', { ascending: false })
    .limit(1);

  if (selErr) throw new Error(selErr.message);

  if (existing && existing.length) {
    const id = existing[0].id;
    const { data, error } = await supabase
      .from('entries')
      .update(entry)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from('entries')
      .insert(entry)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}

// last N days (default 7)
export async function listEntriesLastNDays(days = 7) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');
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
export type Med = {
  id?: string;
  user_id?: string;
  name: string;
  dose?: string;
  schedule?: { times: string[]; days: number[] }; // days: 1=Mon ... 7=Sun
  created_at?: string;
};

export async function listMeds(): Promise<Med[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');
  const { data, error } = await supabase
    .from('meds')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Med[];
}

export async function upsertMed(m: Omit<Med, 'id' | 'user_id' | 'created_at'> & { id?: string }) {
  // if id present -> update; else insert
  const { data, error } = await supabase
    .from('meds')
    .upsert(m, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Med;
}

export async function deleteMed(id: string) {
  const { error } = await supabase.from('meds').delete().eq('id', id);
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

  // start from now, look ahead ~14 events
  let cursor = new Date();
  // scan up to 30 days to be safe for sparse schedules
  const end = new Date();
  end.setDate(end.getDate() + 30);

  while (out.length < count && cursor <= end) {
    const policyDay = jsDayToPolicy(cursor.getDay());
    if (schedule.days.includes(policyDay)) {
      for (const t of schedule.times) {
        const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
        if (Number.isFinite(hh) && Number.isFinite(mm)) {
          const when = new Date(
            cursor.getFullYear(),
            cursor.getMonth(),
            cursor.getDate(),
            hh,
            mm,
            0,
            0
          );
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
  // clamp to 1..7 and uniq
  days = Array.from(new Set(days.filter((d) => d >= 1 && d <= 7)));
  return { times, days };
}
export type MedLog = {
  id?: string;
  user_id?: string;
  med_id: string;
  taken_at?: string; // ISO
  status: 'taken' | 'skipped' | 'missed';
  scheduled_for?: string; // ISO
  note?: string;
};

export async function logMedDose(input: { med_id: string; status: 'taken' | 'skipped' | 'missed'; taken_at?: string; scheduled_for?: string; note?: string }) {
  const { data, error } = await supabase
    .from('meds_log')
    .insert({ 
      med_id: input.med_id, 
      status: input.status, 
      taken_at: input.taken_at ?? null,
      scheduled_for: input.scheduled_for ?? null,
      note: input.note ?? null 
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as MedLog;
}

export async function listMedLogsLastNDays(days = 7) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('meds_log')
    .select('*')
    .eq('user_id', user.id)
    .gte('taken_at', since.toISOString())
    .order('taken_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MedLog[];
}
// Mood types
export type MoodCheckin = {
  id: string;
  user_id: string;
  created_at: string; // ISO
  mood: number;       // 1..5
  energy?: number | null; // 1..5
  tags?: string[] | null;
  note?: string | null;
  ctx?: Record<string, any> | null;
};

export type UpsertMoodInput = {
  mood: number;             // required
  energy?: number;          // optional
  tags?: string[];          // optional
  note?: string;            // optional
  ctx?: Record<string, any>;
  // allow custom timestamp (e.g., backfill). If omitted, DB uses now()
  created_at?: string;
};

// List most recent N mood check-ins
export async function listMoodCheckins(limit = 30): Promise<MoodCheckin[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

  const { data, error } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as MoodCheckin[];
}

// List mood check-ins between start..end (ISO timestamptz strings)
export async function listMoodCheckinsRange(startISO: string, endISO: string): Promise<MoodCheckin[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

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

// Upsert (insert only for now; updates could be supported later)
export async function addMoodCheckin(input: UpsertMoodInput): Promise<MoodCheckin> {
  const payload = {
    mood: input.mood,
    energy: input.energy ?? null,
    tags: input.tags ?? [],
    note: input.note ?? null,
    ctx: input.ctx ?? {},
    ...(input.created_at ? { created_at: input.created_at } : {}),
  };
  const { data, error } = await supabase
    .from('mood_checkins')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as MoodCheckin;
}

export async function deleteMoodCheckin(id: string): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

  const { error } = await supabase
    .from('mood_checkins')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
}

// Did user log today? (same local day window)
export async function hasMoodToday(localTZOffsetMinutes = 0): Promise<boolean> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

  // We'll compute "today 00:00" and "today 23:59" in local time on the client
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

export async function logMindfulnessEvent(input: Omit<MindfulnessEvent, 'id' | 'user_id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('mindfulness_events')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as MindfulnessEvent;
}

export async function listMindfulnessEvents(limit = 30) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

  const { data, error } = await supabase
    .from('mindfulness_events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MindfulnessEvent[];
}
export type SleepSession = {
  id: string; user_id: string; start_time: string; end_time: string;
  source: 'healthkit'|'googlefit'|'phone_infer'|'manual';
  quality?: number | null; note?: string | null; created_at: string;
};

export type SleepCandidate = {
  id: string; user_id: string; start_guess: string; end_guess: string;
  confidence: number; ctx?: Record<string, any> | null; created_at: string;
};

export type SleepPrefs = {
  user_id: string;
  target_sleep_minutes?: number | null;
  typical_wake_time?: string | null;          // 'HH:MM:SS'
  work_days?: number[] | null;
  bedtime_window_start?: string | null;
  bedtime_window_end?: string | null;
  updated_at: string;
};

// CRUD
export async function upsertSleepPrefs(prefs: Partial<SleepPrefs>) {
  const { data, error } = await supabase
    .from('sleep_prefs')
    .upsert(prefs, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as SleepPrefs;
}

export async function getSleepPrefs() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

  const { data, error } = await supabase
    .from('sleep_prefs')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error && (error as any).code !== 'PGRST116') throw error; // not found ok
  return (data ?? null) as SleepPrefs | null;
}

export async function listSleepSessions(days = 14) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

  const since = new Date(); since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('sleep_sessions')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', since.toISOString())
    .order('start_time', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SleepSession[];
}

export async function addSleepSession(input: Omit<SleepSession,'id'|'user_id'|'created_at'>) {
  const { data, error } = await supabase
    .from('sleep_sessions')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as SleepSession;
}

const HEALTH_PLATFORM_TO_SLEEP_SOURCE: Record<HealthPlatform, SleepSession['source']> = {
  apple_healthkit: 'healthkit',
  google_fit: 'googlefit',
  health_connect: 'googlefit',
  samsung_health: 'googlefit',
  garmin: 'manual',
  huawei: 'manual',
  unknown: 'manual',
};

function sleepSessionId(userId: string, startISO: string) {
  return `${userId}_${startISO}`;
}

export async function upsertSleepSessionFromHealth(input: {
  startTime: Date;
  endTime: Date;
  source: HealthPlatform;
}): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

  const startISO = input.startTime.toISOString();
  const row = {
    id: sleepSessionId(user.id, startISO),
    user_id: user.id,
    start_time: startISO,
    end_time: input.endTime.toISOString(),
    source: HEALTH_PLATFORM_TO_SLEEP_SOURCE[input.source] ?? 'manual',
  };

  const { error } = await supabase
    .from('sleep_sessions')
    .upsert(row, { onConflict: 'id' })
    .select('id')
    .single();

  if (error) throw error;
}

export async function upsertDailyActivityFromHealth(input: {
  date: Date;
  steps?: number | null;
  activeEnergy?: number | null;
  source?: HealthPlatform | null;
}): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

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

  const { error } = await supabase
    .from('activity_daily')
    .upsert(row, { onConflict: 'id' })
    .select('id')
    .single();

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
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

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

export async function listSleepCandidates(limit = 3) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

  const { data, error } = await supabase
    .from('sleep_candidates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SleepCandidate[];
}

export async function insertSleepCandidate(input: Omit<SleepCandidate,'id'|'user_id'|'created_at'>) {
  const { data, error } = await supabase
    .from('sleep_candidates')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as SleepCandidate;
}

export async function resolveSleepCandidate(id: string, accept: boolean, note?: string) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

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
      end_time:   data.end_guess,
      source:     'phone_infer',
      quality:    null,
      note,
    });
  }
  await supabase.from('sleep_candidates').delete().eq('id', id).eq('user_id', user.id);
}
// --- Meditation types ---
export type MeditationSession = {
  id: string;
  startTime: string;            // ISO
  endTime?: string;             // ISO
  durationSec?: number;
  note?: string;
  meditationType?: import("./meditations").MeditationType;
};

const MEDITATION_KEY = "@reclaim/meditations/v1";

async function readMeditations(): Promise<MeditationSession[]> {
  const raw = await AsyncStorage.getItem(MEDITATION_KEY);
  return raw ? JSON.parse(raw) as MeditationSession[] : [];
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
  const idx = rows.findIndex(r => r.id === session.id);
  if (idx >= 0) rows[idx] = session; else rows.unshift(session);
  await writeMeditations(rows);
  return session;
}

export async function deleteMeditation(id: string): Promise<void> {
  const rows = await readMeditations();
  await writeMeditations(rows.filter(r => r.id !== id));
}

export function createMeditationStart(note?: string, meditationType?: import("./meditations").MeditationType): MeditationSession {
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
export type MoodEntry = {
  id: string;
  rating: number;        // 1..10
  note?: string;
  created_at: string;    // ISO
};

const MOOD_KEY = "@reclaim/mood/v1";

export async function listMood(limit = 100): Promise<MoodEntry[]> {
  const raw = await AsyncStorage.getItem(MOOD_KEY);
  const rows: MoodEntry[] = raw ? JSON.parse(raw) : [];
  const sorted = rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return sorted.slice(0, limit);
}

export async function upsertMood(entry: MoodEntry): Promise<MoodEntry> {
  const raw = await AsyncStorage.getItem(MOOD_KEY);
  const rows: MoodEntry[] = raw ? JSON.parse(raw) : [];
  const idx = rows.findIndex(r => r.id === entry.id);
  if (idx >= 0) rows[idx] = entry; else rows.unshift(entry);
  await AsyncStorage.setItem(MOOD_KEY, JSON.stringify(rows));
  return entry;
}

export async function deleteMood(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(MOOD_KEY);
  const rows: MoodEntry[] = raw ? JSON.parse(raw) : [];
  await AsyncStorage.setItem(MOOD_KEY, JSON.stringify(rows.filter(r => r.id !== id)));
}

export async function latestMood(): Promise<MoodEntry | null> {
  const rows = await listMood(1);
  return rows[0] ?? null;
}

export async function weekAverageMood(): Promise<number | null> {
  const now = new Date();
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rows = await listMood(500);
  const week = rows.filter(r => new Date(r.created_at) >= past);
  if (!week.length) return null;
  const sum = week.reduce((acc, r) => acc + (r.rating || 0), 0);
  return Math.round((sum / week.length) * 10) / 10;
}

export function createMoodEntry(rating: number, note?: string): MoodEntry {
  const id = (globalThis.crypto as any)?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2);
  return { id, rating, note, created_at: new Date().toISOString() };
}
export type MedDoseLog = {
  id: string;
  med_id: string;
  status: 'taken' | 'missed' | 'skipped';
  scheduled_for: string; // ISO of planned dose time
  taken_at?: string | null; // ISO when taken (if taken)
  created_at?: string; // optional
};

const MED_LOGS_KEY = "@reclaim/meds/logs/v1";

export async function listMedDoseLogs(): Promise<MedDoseLog[]> {
  const raw = await AsyncStorage.getItem(MED_LOGS_KEY);
  const rows: MedDoseLog[] = raw ? JSON.parse(raw) : [];
  // newest first
  return rows.sort((a, b) => (b.scheduled_for ?? '').localeCompare(a.scheduled_for ?? ''));
}

export async function listMedDoseLogsBetween(startISO: string, endISO: string): Promise<MedDoseLog[]> {
  const rows = await listMedDoseLogs();
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return rows.filter(r => {
    const t = new Date(r.scheduled_for).getTime();
    return t >= s && t <= e;
  });
}

export async function listMedDoseLogsLastNDays(n: number): Promise<MedDoseLog[]> {
  const end = new Date(); end.setHours(23,59,59,999);
  const start = new Date(end); start.setDate(end.getDate() - (n - 1)); start.setHours(0,0,0,0);
  return listMedDoseLogsBetween(start.toISOString(), end.toISOString());
}

export async function listMedDoseLogsRemoteLastNDays(days = 7): Promise<MedDoseLog[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No session');

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

// Simple adherence calc: taken / scheduled (exclude 'skipped' from numerator)
export function computeAdherence(logs: MedDoseLog[]) {
  const scheduled = logs.length;
  const taken = logs.filter(l => l.status === 'taken').length;
  const pct = scheduled ? Math.round((taken / scheduled) * 100) : 0;
  return { scheduled, taken, pct };
}