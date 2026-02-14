/**
 * Dashboard helper utilities. Extracted from Dashboard.tsx.
 */

export function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getSleepMidpointMinutes(startISO?: string | null, endISO?: string | null): number | null {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const midpoint = start + (end - start) / 2;
  const midpointDate = new Date(midpoint);
  return midpointDate.getHours() * 60 + midpointDate.getMinutes();
}

export function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function sleepConsistencyText(midpointStdMinutes: number) {
  if (!Number.isFinite(midpointStdMinutes)) return { valueText: '—', helper: '—' };
  if (midpointStdMinutes <= 20) return { valueText: 'Steady', helper: `${Math.round(midpointStdMinutes)}m drift` };
  if (midpointStdMinutes <= 45) return { valueText: 'Improving', helper: `${Math.round(midpointStdMinutes)}m drift` };
  if (midpointStdMinutes <= 75) return { valueText: 'Shifting', helper: `${Math.round(midpointStdMinutes)}m drift` };
  return { valueText: 'Unstable', helper: `${Math.round(midpointStdMinutes)}m drift` };
}

export function medsOnTrackText(pct: number) {
  if (!Number.isFinite(pct)) return { valueText: '—', helper: '—' };
  const p = Math.round(pct);
  if (p >= 90) return { valueText: 'On track', helper: `${p}% this week` };
  if (p >= 70) return { valueText: 'Getting there', helper: `${p}% this week` };
  if (p >= 40) return { valueText: 'Needs a nudge', helper: `${p}% this week` };
  return { valueText: 'Off track', helper: `${p}% this week` };
}

export function parseHHMMToMinutes(hhmm: string): number | null {
  const s = (hhmm ?? '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export function dateWithTimeLikeToday(timeMins: number, base?: Date) {
  const now = base ?? new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(timeMins);
  return d;
}

export function tomorrowNoonLocal(base = new Date()) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function minutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatRange(start: Date, end: Date) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Reason shown when no good time slot found for a routine */
export const ROUTINE_NO_SLOT_REASON = 'no good slot found — choose a time';
