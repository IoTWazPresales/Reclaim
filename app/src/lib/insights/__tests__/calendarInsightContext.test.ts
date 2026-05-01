import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/calendar', () => ({
  hasCalendarPermissions: vi.fn(),
  getEventsForDateRangeIfGranted: vi.fn(),
}));

import { hasCalendarPermissions, getEventsForDateRangeIfGranted } from '@/lib/calendar';
import { buildCalendarInsightContext } from '@/lib/insights/calendarInsightContext';

describe('buildCalendarInsightContext', () => {
  beforeEach(() => {
    vi.mocked(hasCalendarPermissions).mockReset();
    vi.mocked(getEventsForDateRangeIfGranted).mockReset();
  });

  it('returns undefined when calendar permission is not granted', async () => {
    vi.mocked(hasCalendarPermissions).mockResolvedValue(false);
    await expect(buildCalendarInsightContext()).resolves.toBeUndefined();
    expect(getEventsForDateRangeIfGranted).not.toHaveBeenCalled();
  });

  it('flags hasDemandingBlockSoon when a demanding event starts within 6h', async () => {
    vi.mocked(hasCalendarPermissions).mockResolvedValue(true);
    const now = new Date('2026-04-16T10:00:00.000Z');
    const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    vi.mocked(getEventsForDateRangeIfGranted).mockResolvedValue([
      { id: 'e1', title: 'Interview with team', startDate: start, endDate: end, allDay: false },
    ]);

    const out = await buildCalendarInsightContext(now);
    expect(out).toBeDefined();
    expect(out!.hasDemandingBlockSoon).toBe(true);
    expect(out!.minutesToNextDemandingStart).toBe(120);
    expect(out!.demandingEventsTodayCount).toBe(1);
  });

  it('counts demanding events that start today (local)', async () => {
    vi.mocked(hasCalendarPermissions).mockResolvedValue(true);
    const now = new Date('2026-04-16T14:00:00.000Z');
    const start = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    vi.mocked(getEventsForDateRangeIfGranted).mockResolvedValue([
      { id: 'e1', title: '1:1 with manager', startDate: start, endDate: end, allDay: false },
    ]);

    const out = await buildCalendarInsightContext(now);
    expect(out!.hasDemandingBlockSoon).toBe(false);
    expect(out!.demandingEventsTodayCount).toBe(1);
  });
});
