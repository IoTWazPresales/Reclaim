/**
 * Pure medication schedule, PRN marker, and schedule-based adherence math.
 * Kept free of supabase/expo so Vitest can cover it without the full app module graph.
 */

// -------------------------
// Types
// -------------------------
/** Fixed times + days of week (1=Mon … 7=Sun). */
export type MedicationSchedule = { times: string[]; days: number[] };

/**
 * As-needed / PRN marker stored in `meds.schedule` JSON (no DB migration).
 * Distinct from “no schedule yet” (undefined).
 */
export type PrnScheduleMarker = { prn: true };

export type MedSchedule = MedicationSchedule | PrnScheduleMarker;

export type MedForSchedule = {
  id?: string;
  schedule?: MedSchedule;
};

export type MedDoseLogForAdherence = {
  med_id?: string;
  status: 'taken' | 'missed' | 'skipped' | string;
  taken_at?: string | null;
  scheduled_for?: string | null;
  created_at?: string | null;
};

// -------------------------
// Schedule classification
// -------------------------
export function isPrnSchedule(schedule: MedSchedule | undefined): schedule is PrnScheduleMarker {
  return !!schedule && typeof schedule === 'object' && 'prn' in schedule && (schedule as PrnScheduleMarker).prn === true;
}

/** True when the med uses daily/weekly fixed dose times (eligible for reminders + adherence expected doses). */
export function isScheduledMed(m: Pick<MedForSchedule, 'schedule'>): boolean {
  const s = m.schedule;
  if (!s || isPrnSchedule(s)) return false;
  const sc = s as MedicationSchedule;
  return Array.isArray(sc.times) && sc.times.length > 0 && Array.isArray(sc.days) && sc.days.length > 0;
}

export function isPrnMed(m: Pick<MedForSchedule, 'schedule'>): boolean {
  return isPrnSchedule(m.schedule);
}

// helpers: 1=Mon ... 7=Sun (JS getDay(): 0=Sun -> map to 7)
export function jsDayToPolicy(d: number) {
  return d === 0 ? 7 : d;
}

/**
 * Count expected dose slots for a schedule within a date range (inclusive).
 */
export function countExpectedDosesInRange(
  schedule: { times: string[]; days: number[] } | undefined,
  start: Date,
  end: Date
): number {
  if (!schedule?.times?.length || !schedule?.days?.length) return 0;
  let count = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);
  while (cursor <= endDay) {
    const policyDay = jsDayToPolicy(cursor.getDay());
    if (schedule.days.includes(policyDay)) {
      count += schedule.times.length;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Schedule-based adherence: expected = doses from **scheduled** med schedules in last N days;
 * taken = **taken** logs only for medications that have a fixed schedule (PRN/as-needed excluded).
 */
export function computeAdherenceFromSchedule(
  logs: MedDoseLogForAdherence[],
  meds: Array<{ id?: string; schedule?: MedSchedule | undefined }>,
  days = 7,
  asOf: Date = new Date(),
): { scheduled: number; taken: number; pct: number } {
  const end = new Date(asOf);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const scheduledMedIds = new Set(
    meds.filter((m) => m.id && isScheduledMed(m)).map((m) => m.id as string),
  );

  let expected = 0;
  for (const med of meds) {
    if (med.id && isScheduledMed(med)) {
      expected += countExpectedDosesInRange(med.schedule as MedicationSchedule, start, end);
    }
  }

  const windowStart = start.getTime();
  const windowEnd = end.getTime();
  const taken = logs.filter((l) => {
    if (l.status !== 'taken') return false;
    if (!l.med_id || !scheduledMedIds.has(l.med_id)) return false;
    const t = l.taken_at ?? l.scheduled_for ?? l.created_at;
    if (!t) return false;
    const ms = new Date(t).getTime();
    return ms >= windowStart && ms <= windowEnd;
  }).length;

  const pct = expected > 0 ? Math.round((taken / expected) * 100) : 0;
  return { scheduled: expected, taken, pct };
}
