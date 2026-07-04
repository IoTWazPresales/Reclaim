import type { MedCatalogItem } from '@/lib/medCatalog';
import type { MedDetailScheduleView } from './medDetailTypes';

export type CatalogEducationMode = 'curated' | 'general';

export function resolveCatalogEducationMode(catalogMatch: MedCatalogItem | null): CatalogEducationMode {
  return catalogMatch ? 'curated' : 'general';
}

export const GENERAL_PROFILE_EDUCATION_COPY =
  'Without a catalogue match, we still show schedule, reminders, and your logging below. That’s useful context for you and your care team — it’s not proof of what medication you’re taking or how it affects you.';

export const EMPTY_CONTEXT_NOTES_COPY =
  'No personalized notes right now — keep logging mood and sleep for deeper context.';

export type MedScheduleMode = 'prn' | 'scheduled';

export function resolveMedScheduleMode(schedule: MedDetailScheduleView): MedScheduleMode {
  return schedule.isPrn ? 'prn' : 'scheduled';
}

export function resolveRecentDosesEmptyCopy(isPrn: boolean): string {
  return isPrn
    ? 'No doses logged in the last 30 days. As-needed medications are tracked by use, not daily adherence.'
    : 'No doses logged in the last 30 days.';
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Human schedule days: "Every day" / "Weekdays" / "Weekends" / "Mon, Wed, Fri".
 * Days use policy numbering (1=Mon … 7=Sun) but users never see the numbers.
 */
export function formatScheduleDaysLabel(days: number[] | undefined | null): string {
  if (!days || days.length === 0) return 'Every day';
  const unique = Array.from(new Set(days.filter((d) => d >= 1 && d <= 7))).sort((a, b) => a - b);
  if (unique.length === 0) return 'Every day';
  if (unique.length === 7) return 'Every day';
  if (unique.length === 5 && unique.every((d, i) => d === i + 1)) return 'Weekdays';
  if (unique.length === 2 && unique[0] === 6 && unique[1] === 7) return 'Weekends';
  return unique.map((d) => DAY_NAMES[d - 1]).join(', ');
}

/**
 * Next dose from a fixed schedule: "Today 20:00", "Tomorrow 08:00", "Mon 08:00".
 * Null when there is no fixed schedule to project.
 */
export function formatNextDoseLabel(
  schedule: { times?: string[] | null; days?: number[] | null } | null | undefined,
  now: Date = new Date(),
): string | null {
  const times = (schedule?.times ?? []).filter((t) => /^\d{1,2}:\d{2}$/.test(t));
  if (times.length === 0) return null;
  const days = (schedule?.days ?? []).filter((d) => d >= 1 && d <= 7);
  const activeDays = days.length > 0 ? new Set(days) : new Set([1, 2, 3, 4, 5, 6, 7]);

  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const policyDay = day.getDay() === 0 ? 7 : day.getDay(); // 1=Mon … 7=Sun
    if (!activeDays.has(policyDay)) continue;
    for (const t of [...times].sort()) {
      const [h, m] = t.split(':').map((n) => parseInt(n, 10));
      const candidate = new Date(day);
      candidate.setHours(h, m, 0, 0);
      if (candidate.getTime() <= now.getTime()) continue;
      const prefix =
        offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : DAY_NAMES[policyDay - 1];
      return `${prefix} ${t}`;
    }
  }
  return null;
}

/**
 * One honest adherence line. Missing data reads "No dose history yet" — never 0%.
 */
export function formatAdherenceLine(
  isPrn: boolean,
  doseHistory: {
    takenCount30: number;
    lastTakenLabel: string | null;
    scheduleAdherence30: { taken: number; scheduled: number; pct: number } | null;
  },
): string {
  if (isPrn) {
    if (doseHistory.takenCount30 === 0) return 'No doses logged in the last 30 days.';
    const times = `${doseHistory.takenCount30} time${doseHistory.takenCount30 === 1 ? '' : 's'}`;
    return `Taken ${times} in the last 30 days${doseHistory.lastTakenLabel ? ` · last ${doseHistory.lastTakenLabel}` : ''}.`;
  }
  const adherence = doseHistory.scheduleAdherence30;
  if (!adherence || adherence.scheduled === 0) return 'No dose history yet.';
  return `Adherence (30 days): ${adherence.pct}% — ${adherence.taken} of ${adherence.scheduled} scheduled doses.`;
}
