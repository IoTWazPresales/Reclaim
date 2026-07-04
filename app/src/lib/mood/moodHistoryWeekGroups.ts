import type { MoodEntry } from '@/lib/api';

export type MoodWeekGroupLabel = 'This week' | 'Last week' | 'Earlier';

export type MoodHistoryWeekGroup = {
  label: MoodWeekGroupLabel;
  entries: MoodEntry[];
};

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function weekBucket(dayIso: string, ref: Date): MoodWeekGroupLabel {
  const day = new Date(`${dayIso}T12:00:00`);
  if (Number.isNaN(day.getTime())) return 'Earlier';

  const thisWeek = startOfWeekMonday(ref).getTime();
  const entryWeek = startOfWeekMonday(day).getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const diff = Math.round((thisWeek - entryWeek) / weekMs);

  if (diff <= 0) return 'This week';
  if (diff === 1) return 'Last week';
  return 'Earlier';
}

export function groupMoodHistoryByWeek(
  entries: MoodEntry[],
  dayKey: (entry: MoodEntry) => string,
  refDate: Date = new Date(),
): MoodHistoryWeekGroup[] {
  const buckets: Record<MoodWeekGroupLabel, MoodEntry[]> = {
    'This week': [],
    'Last week': [],
    Earlier: [],
  };

  for (const entry of entries) {
    const k = dayKey(entry);
    buckets[weekBucket(k, refDate)].push(entry);
  }

  return (['This week', 'Last week', 'Earlier'] as const)
    .filter((label) => buckets[label].length > 0)
    .map((label) => ({ label, entries: buckets[label] }));
}
