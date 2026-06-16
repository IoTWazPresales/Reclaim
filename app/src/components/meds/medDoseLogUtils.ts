import type { MedDoseRow } from './medDetailTypes';

export const logWhenISO = (l: MedDoseRow) =>
  l.scheduled_for ?? l.taken_at ?? l.created_at ?? new Date().toISOString();

export const logWhenDate = (l: MedDoseRow) => new Date(logWhenISO(l));

export function formatLocalDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function groupDoseLogsByDay(medLogs: MedDoseRow[]): [string, MedDoseRow[]][] {
  const map = new Map<string, MedDoseRow[]>();
  for (const l of medLogs) {
    const d = logWhenDate(l);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
    map.set(key, [...(map.get(key) ?? []), l]);
  }
  return Array.from(map.entries()).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
}
