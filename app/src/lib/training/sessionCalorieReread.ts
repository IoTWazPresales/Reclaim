/**
 * Post-session Health Connect calorie re-read.
 *
 * ActiveCaloriesBurned records are time intervals. They do not name a set.
 * The stored grain is the session window total. This module never writes a
 * per-set calorie field.
 *
 * A later read replaces the stored total only when it is a positive Health
 * Connect total for the same window and it is greater than the stored total,
 * or when no positive total is stored yet. A later empty or smaller read does
 * not wipe a larger one. The wait before the re-read is time for Health
 * Connect to ingest a late sync. It is not a calorie model.
 */
/** Wait for a late Health Connect ingest. Not a training-load constant. */
export const SESSION_CALORIE_REREAD_DELAY_MS = 60_000;

/**
 * How long after the session ends a stored total may still be replaced by a
 * later Health Connect read. Operational sync wait, not a training-load constant.
 */
export const SESSION_CALORIE_REREAD_WINDOW_MS = 30 * 60 * 1000;

export type SessionCalorieRead = {
  activeCaloriesKcal: number | null;
  source: 'health_connect' | null;
};

export type SessionCalorieWindow = {
  start: string;
  end: string;
};

export type SessionCalorieRereadResult = {
  summary: Record<string, unknown>;
  updated: boolean;
};

function storedKcal(summary: Record<string, unknown>): number {
  const value = summary.activeCaloriesKcal;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function sameWindow(summary: Record<string, unknown>, window: SessionCalorieWindow): boolean {
  const existing = summary.energyWindow;
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) return true;
  const start = (existing as { start?: unknown }).start;
  const end = (existing as { end?: unknown }).end;
  if (typeof start !== 'string' || typeof end !== 'string') return true;
  return start === window.start && end === window.end;
}

/**
 * Decide whether a Health Connect window read becomes the stored session total.
 * Does not attach the total to individual sets.
 */
export function applySessionCalorieReread(
  summary: Record<string, unknown>,
  read: SessionCalorieRead,
  window: SessionCalorieWindow,
  readAt: string,
): SessionCalorieRereadResult {
  if (read.source !== 'health_connect') return { summary, updated: false };
  const kcal = read.activeCaloriesKcal;
  if (kcal == null || !Number.isFinite(kcal) || kcal <= 0) return { summary, updated: false };
  if (!window.start || !window.end || !readAt) return { summary, updated: false };
  if (!sameWindow(summary, window)) return { summary, updated: false };

  const previous = storedKcal(summary);
  if (previous > kcal) return { summary, updated: false };
  if (previous === kcal && typeof summary.energyReadAt === 'string' && summary.energyReadAt.length > 0) {
    return { summary, updated: false };
  }

  return {
    updated: true,
    summary: {
      ...summary,
      activeCaloriesKcal: kcal,
      energySource: 'health_connect',
      energyReadAt: readAt,
      energyWindow: { start: window.start, end: window.end },
    },
  };
}

export function calorieRereadStillDue(endedAtIso: string, nowMs: number): boolean {
  const ended = Date.parse(endedAtIso);
  if (!Number.isFinite(ended)) return false;
  return nowMs < ended + SESSION_CALORIE_REREAD_WINDOW_MS;
}

/**
 * Apply one window read and decide whether the summary must be saved.
 * `energyRereadPending` stays true until the sync window has passed.
 */
export function commitSessionCalorieReread(
  summary: Record<string, unknown>,
  read: SessionCalorieRead,
  window: SessionCalorieWindow,
  readAt: string,
): { summary: Record<string, unknown>; save: boolean } {
  const applied = applySessionCalorieReread(summary, read, window, readAt);
  const next = { ...(applied.updated ? applied.summary : summary) };
  const stillDue = calorieRereadStillDue(window.end, Date.parse(readAt));
  next.energyRereadPending = stillDue;
  const pendingChanged = summary.energyRereadPending !== stillDue;
  return { summary: next, save: applied.updated || pendingChanged };
}

export function scheduleSessionCalorieReread(args: {
  delayMs?: number;
  window: SessionCalorieWindow;
  read: () => Promise<SessionCalorieRead>;
  loadSummary: () => Promise<Record<string, unknown>>;
  saveSummary: (summary: Record<string, unknown>) => Promise<void>;
  now?: () => string;
}): void {
  const delay = args.delayMs ?? SESSION_CALORIE_REREAD_DELAY_MS;
  const timer = setTimeout(() => {
    void runSessionCalorieReread(args).catch((error) => {
      if (__DEV__) console.debug('[sessionCalorieReread] re-read failed', error);
    });
  }, delay);
  const maybeUnref = timer as { unref?: () => void };
  maybeUnref.unref?.();
}

async function runSessionCalorieReread(args: {
  window: SessionCalorieWindow;
  read: () => Promise<SessionCalorieRead>;
  loadSummary: () => Promise<Record<string, unknown>>;
  saveSummary: (summary: Record<string, unknown>) => Promise<void>;
  now?: () => string;
}): Promise<void> {
  const read = await args.read();
  const summary = await args.loadSummary();
  const readAt = args.now ? args.now() : new Date().toISOString();
  const committed = commitSessionCalorieReread(summary, read, args.window, readAt);
  if (!committed.save) return;
  await args.saveSummary(committed.summary);
}
