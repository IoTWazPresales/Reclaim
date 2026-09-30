import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  applySessionCalorieReread,
  commitSessionCalorieReread,
  scheduleSessionCalorieReread,
  SESSION_CALORIE_REREAD_DELAY_MS,
  SESSION_CALORIE_REREAD_WINDOW_MS,
} from '../sessionCalorieReread';

const window = { start: '2026-09-30T10:00:00.000Z', end: '2026-09-30T11:00:00.000Z' };
const readAt = '2026-09-30T11:01:00.000Z';

describe('applySessionCalorieReread', () => {
  it('stores a later positive read when the first read was empty', () => {
    const applied = applySessionCalorieReread(
      { totalSets: 8 },
      { activeCaloriesKcal: 180, source: 'health_connect' },
      window,
      readAt,
    );
    expect(applied.updated).toBe(true);
    expect(applied.summary).toEqual({
      totalSets: 8,
      activeCaloriesKcal: 180,
      energySource: 'health_connect',
      energyReadAt: readAt,
      energyWindow: window,
    });
    expect(applied.summary).not.toHaveProperty('caloriesPerSet');
    expect(applied.summary).not.toHaveProperty('perSetCaloriesKcal');
    expect(applied.summary).not.toHaveProperty('setCaloriesKcal');
  });

  it('replaces a smaller stored total and keeps the session items untouched', () => {
    const items = [{ performed: { sets: [{ setIndex: 1 }] } }];
    const applied = applySessionCalorieReread(
      {
        activeCaloriesKcal: 40,
        energySource: 'health_connect',
        energyReadAt: '2026-09-30T11:00:05.000Z',
        energyWindow: window,
        items,
      },
      { activeCaloriesKcal: 95, source: 'health_connect' },
      window,
      readAt,
    );
    expect(applied.updated).toBe(true);
    expect(applied.summary.activeCaloriesKcal).toBe(95);
    expect(applied.summary.energyReadAt).toBe(readAt);
    expect(applied.summary.items).toBe(items);
  });

  it('does not replace a larger total with a later smaller or empty read', () => {
    const stored = {
      activeCaloriesKcal: 120,
      energySource: 'health_connect',
      energyReadAt: '2026-09-30T11:00:05.000Z',
      energyWindow: window,
    };
    expect(
      applySessionCalorieReread(stored, { activeCaloriesKcal: 30, source: 'health_connect' }, window, readAt),
    ).toEqual({ summary: stored, updated: false });
    expect(
      applySessionCalorieReread(stored, { activeCaloriesKcal: null, source: 'health_connect' }, window, readAt),
    ).toEqual({ summary: stored, updated: false });
  });

  it('ignores a read for a different window and a read without Health Connect provenance', () => {
    const stored = { totalSets: 2 };
    expect(
      applySessionCalorieReread(
        { ...stored, energyWindow: window },
        { activeCaloriesKcal: 50, source: 'health_connect' },
        { start: window.start, end: '2026-09-30T12:00:00.000Z' },
        readAt,
      ).updated,
    ).toBe(false);
    expect(
      applySessionCalorieReread(stored, { activeCaloriesKcal: 50, source: null }, window, readAt).updated,
    ).toBe(false);
  });

  it('stamps provenance on an equal total that has no read time', () => {
    const applied = applySessionCalorieReread(
      { activeCaloriesKcal: 70, energyWindow: window },
      { activeCaloriesKcal: 70, source: 'health_connect' },
      window,
      readAt,
    );
    expect(applied.updated).toBe(true);
    expect(applied.summary.energyReadAt).toBe(readAt);
    expect(applied.summary.energySource).toBe('health_connect');
  });
});

describe('commitSessionCalorieReread', () => {
  it('keeps a later re-read due inside the sync window and does not split sets', () => {
    const committed = commitSessionCalorieReread(
      { totalSets: 3, energyRereadPending: true },
      { activeCaloriesKcal: 180, source: 'health_connect' },
      window,
      readAt,
    );
    expect(committed.save).toBe(true);
    expect(committed.summary.energyRereadPending).toBe(true);
    expect(committed.summary.activeCaloriesKcal).toBe(180);
    expect(committed.summary).not.toHaveProperty('caloriesPerSet');
    expect(Date.parse(readAt) - Date.parse(window.end)).toBeLessThan(SESSION_CALORIE_REREAD_WINDOW_MS);
  });

  it('clears the pending flag after the sync window without inventing a total', () => {
    const later = new Date(Date.parse(window.end) + SESSION_CALORIE_REREAD_WINDOW_MS).toISOString();
    const committed = commitSessionCalorieReread(
      { totalSets: 3, energyRereadPending: true },
      { activeCaloriesKcal: null, source: 'health_connect' },
      window,
      later,
    );
    expect(committed.save).toBe(true);
    expect(committed.summary.energyRereadPending).toBe(false);
    expect(committed.summary).not.toHaveProperty('activeCaloriesKcal');
    expect(committed.summary).not.toHaveProperty('caloriesPerSet');
  });
});

describe('scheduleSessionCalorieReread', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the later window total with provenance and does not write per-set calories', async () => {
    const saveSummary = vi.fn(async () => undefined);
    scheduleSessionCalorieReread({
      window,
      now: () => readAt,
      loadSummary: async () => ({ totalSets: 4 }),
      read: async () => ({ activeCaloriesKcal: 90, source: 'health_connect' }),
      saveSummary,
    });
    expect(saveSummary).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SESSION_CALORIE_REREAD_DELAY_MS);
    expect(saveSummary).toHaveBeenCalledWith({
      totalSets: 4,
      activeCaloriesKcal: 90,
      energySource: 'health_connect',
      energyReadAt: readAt,
      energyWindow: window,
      energyRereadPending: true,
    });
  });

  it('does not save when the later read is smaller than the stored total', async () => {
    const saveSummary = vi.fn(async () => undefined);
    scheduleSessionCalorieReread({
      window,
      now: () => readAt,
      loadSummary: async () => ({
        activeCaloriesKcal: 100,
        energySource: 'health_connect',
        energyReadAt: '2026-09-30T11:00:05.000Z',
        energyWindow: window,
        energyRereadPending: true,
      }),
      read: async () => ({ activeCaloriesKcal: 40, source: 'health_connect' }),
      saveSummary,
    });
    await vi.advanceTimersByTimeAsync(SESSION_CALORIE_REREAD_DELAY_MS);
    expect(saveSummary).not.toHaveBeenCalled();
  });
});
