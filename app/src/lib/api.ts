import { supabase } from './supabase';
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  return data as Entry[];
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
  return data;
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
  return data as Med[];
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
  status: 'taken' | 'skipped';
  note?: string;
};

export async function logMedDose(input: { med_id: string; status: 'taken' | 'skipped'; note?: string }) {
  const { data, error } = await supabase
    .from('meds_log')
    .insert({ med_id: input.med_id, status: input.status, note: input.note ?? null })
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
  return data as MedLog[];
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
  const { data, error } = await supabase
    .from('mood_checkins')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as MoodCheckin[];
}

// List mood check-ins between start..end (ISO timestamptz strings)
export async function listMoodCheckinsRange(startISO: string, endISO: string): Promise<MoodCheckin[]> {
  const { data, error } = await supabase
    .from('mood_checkins')
    .select('*')
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
  const { error } = await supabase.from('mood_checkins').delete().eq('id', id);
  if (error) throw error;
}

// Did user log today? (same local day window)
export async function hasMoodToday(localTZOffsetMinutes = 0): Promise<boolean> {
  // We'll compute "today 00:00" and "today 23:59" in local time on the client
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('mood_checkins')
    .select('id, created_at')
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
  const { data, error } = await supabase
    .from('mindfulness_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MindfulnessEvent[];
}
export type SleepSession = {
  id: string; user_id: string; start_time: string; end_time: string;
  source: 'healthkit'|'googlefit'|'health_connect'|'phone_infer'|'manual';
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
  const { data, error } = await supabase.from('sleep_prefs').select('*').single();
  if (error && (error as any).code !== 'PGRST116') throw error; // not found ok
  return (data ?? null) as SleepPrefs | null;
}

export async function listSleepSessions(days = 14) {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('sleep_sessions')
    .select('*')
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

export async function listSleepCandidates(limit = 3) {
  const { data, error } = await supabase
    .from('sleep_candidates')
    .select('*')
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
  const { data, error } = await supabase.from('sleep_candidates').select('*').eq('id', id).single();
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
  await supabase.from('sleep_candidates').delete().eq('id', id);
}
// --- Meditation types ---
export type MeditationSession = {
  id: string;                 // uuid
  startTime: string;          // ISO
  endTime?: string;            // ISO if ended
  durationSec?: number;        // computed on stop
  note?: string;
};

const MEDITATION_KEY = "@reclaim/meditations/v1";

// --- Helpers ---
async function readMeditations(): Promise<MeditationSession[]> {
  const raw = await AsyncStorage.getItem(MEDITATION_KEY);
  return raw ? JSON.parse(raw) as MeditationSession[] : [];
}
async function writeMeditations(rows: MeditationSession[]) {
  await AsyncStorage.setItem(MEDITATION_KEY, JSON.stringify(rows));
}

// --- CRUD ---
export async function listMeditations(): Promise<MeditationSession[]> {
  const rows = await readMeditations();
  // newest first
  return rows.sort((a, b) => (b.startTime.localeCompare(a.startTime)));
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

// convenience creators
export function createMeditationStart(note?: string): MeditationSession {
  return {
    id: crypto.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2),
    startTime: new Date().toISOString(),
    note,
  };
}

export function finishMeditation(s: MeditationSession): MeditationSession {
  const end = new Date();
  const start = new Date(s.startTime);
  const durationSec = Math.max(0, Math.round((+end - +start) / 1000));
  return { ...s, endTime: end.toISOString(), durationSec };
}
