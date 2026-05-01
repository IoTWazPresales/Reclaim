/**
 * Read-only calendar signals for InsightContext (permission already granted elsewhere).
 * Does not request permissions — aligns with wellness nudge behaviour.
 */
import { hasCalendarPermissions, getEventsForDateRangeIfGranted, type CalendarEvent } from '@/lib/calendar';
import { isDemandingCalendarTitle } from '@/lib/calendarDemanding';
import type { InsightContext } from './InsightEngine';

const SOON_MS = 6 * 60 * 60 * 1000;
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function analyseDemandingEvents(now: Date, events: CalendarEvent[]): {
  hasDemandingBlockSoon: boolean;
  minutesToNextDemandingStart?: number;
  demandingEventsTodayCount: number;
} {
  const nowMs = now.getTime();
  const soonEnd = nowMs + SOON_MS;
  const horizonEnd = nowMs + LOOKAHEAD_MS;

  let hasDemandingBlockSoon = false;
  let minMinutes: number | undefined;
  let demandingEventsTodayCount = 0;

  for (const ev of events) {
    if (ev.allDay) continue;
    const title = (ev.title || '').trim();
    if (!isDemandingCalendarTitle(title)) continue;

    const startMs = ev.startDate.getTime();
    const endMs = ev.endDate.getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;

    if (sameLocalDate(ev.startDate, now)) {
      demandingEventsTodayCount += 1;
    }

    if (startMs >= nowMs && startMs <= soonEnd) {
      hasDemandingBlockSoon = true;
    }

    if (startMs >= nowMs && startMs <= horizonEnd) {
      const mins = Math.floor((startMs - nowMs) / 60_000);
      if (minMinutes === undefined || mins < minMinutes) minMinutes = mins;
    }
  }

  return {
    hasDemandingBlockSoon,
    ...(minMinutes !== undefined ? { minutesToNextDemandingStart: minMinutes } : {}),
    demandingEventsTodayCount,
  };
}

/**
 * Returns `undefined` when calendar read is unavailable (no permission), so rules do not misfire.
 * When permission exists, returns explicit booleans/counts even if all are "quiet".
 */
export async function buildCalendarInsightContext(now = new Date()): Promise<InsightContext['calendar'] | undefined> {
  const canRead = await hasCalendarPermissions().catch(() => false);
  if (!canRead) return undefined;

  const dayStart = startOfLocalDay(now);
  const horizonEnd = new Date(now.getTime() + LOOKAHEAD_MS);

  const events = await getEventsForDateRangeIfGranted(dayStart, horizonEnd).catch(() => [] as CalendarEvent[]);

  const { hasDemandingBlockSoon, minutesToNextDemandingStart, demandingEventsTodayCount } = analyseDemandingEvents(
    now,
    events,
  );

  return {
    hasDemandingBlockSoon,
    demandingEventsTodayCount,
    ...(minutesToNextDemandingStart !== undefined ? { minutesToNextDemandingStart } : {}),
  };
}
