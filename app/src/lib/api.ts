import { supabase } from './supabase';

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