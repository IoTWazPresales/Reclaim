/**
 * Lagged pairwise explanations from Signal Ledger history.
 * Under sufficiency gate → returns empty (never fabricate "because").
 */
import type { SignalLedgerPoint } from '@/lib/localData/signalLedgerRepository';

export const EXPLANATION_MIN_PAIRED_POINTS = 7;

export type LedgerExplanation = {
  insightIdHint?: string;
  factorA: string;
  factorB: string;
  lagDays: number;
  correlation: number;
  why: string;
};

const BANNED = /\b(caused|causes|causing|because of your med|your medication made|diagnos|prescrib)/i;

function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < EXPLANATION_MIN_PAIRED_POINTS) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  if (!Number.isFinite(den) || den === 0) return null;
  const r = num / den;
  if (!Number.isFinite(r)) return null;
  return r;
}

function addDaysYYYYMMDD(day: string, lagDays: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + lagDays));
  return dt.toISOString().slice(0, 10);
}

function alignByDay(
  a: SignalLedgerPoint[],
  b: SignalLedgerPoint[],
  lagDays: number,
): { xs: number[]; ys: number[] } {
  const bByDay = new Map(b.map((p) => [p.dayDate, p.value]));
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of a) {
    const key = addDaysYYYYMMDD(p.dayDate, lagDays);
    const y = bByDay.get(key);
    if (y == null) continue;
    xs.push(p.value);
    ys.push(y);
  }
  return { xs, ys };
}

const PAIRS: Array<{
  factorA: string;
  factorB: string;
  lagDays: number;
  labelA: string;
  labelB: string;
  insightIdHints?: string[];
}> = [
  {
    factorA: 'sleep.lastNight.hours',
    factorB: 'mood.last',
    lagDays: 0,
    labelA: 'sleep hours',
    labelB: 'mood',
  },
  {
    factorA: 'sleep.lastNight.hours',
    factorB: 'mood.last',
    lagDays: 1,
    labelA: 'sleep hours',
    labelB: 'mood the next day',
  },
  {
    factorA: 'steps.lastDay',
    factorB: 'mood.last',
    lagDays: 0,
    labelA: 'steps',
    labelB: 'mood',
  },
  {
    factorA: 'training.weeklySessionCount',
    factorB: 'mood.last',
    lagDays: 0,
    labelA: 'weekly training sessions',
    labelB: 'mood',
  },
  {
    factorA: 'sleep.debtHours',
    factorB: 'mood.last',
    lagDays: 1,
    labelA: 'sleep debt',
    labelB: 'mood the next day',
  },
];

function formatWhy(
  labelA: string,
  labelB: string,
  lagDays: number,
  r: number,
): string | null {
  const abs = Math.abs(r);
  if (abs < 0.35) return null;
  const direction = r > 0 ? 'moves with' : 'tends to move opposite';
  const lag =
    lagDays === 0
      ? 'same day'
      : lagDays === 1
        ? 'about a day later'
        : `about ${lagDays} days later`;
  const why = `In your data, ${labelA} ${direction} ${labelB} (${lag}). This is an observational pattern in your logs — not medical advice.`;
  if (BANNED.test(why)) return null;
  return why;
}

/**
 * Rank candidate explanations from multi-series ledger reads.
 * Meds factors are never used as correlation inputs.
 */
export function computeExplanations(
  seriesByFactor: Record<string, SignalLedgerPoint[]>,
): LedgerExplanation[] {
  const out: LedgerExplanation[] = [];
  for (const pair of PAIRS) {
    if (pair.factorA.startsWith('meds.') || pair.factorB.startsWith('meds.')) continue;
    const a = seriesByFactor[pair.factorA] ?? [];
    const b = seriesByFactor[pair.factorB] ?? [];
    const { xs, ys } = alignByDay(a, b, pair.lagDays);
    const r = pearson(xs, ys);
    if (r == null) continue;
    const why = formatWhy(pair.labelA, pair.labelB, pair.lagDays, r);
    if (!why) continue;
    out.push({
      factorA: pair.factorA,
      factorB: pair.factorB,
      lagDays: pair.lagDays,
      correlation: r,
      why,
    });
  }
  out.sort((x, y) => Math.abs(y.correlation) - Math.abs(x.correlation));
  return out;
}

/** Attach top explanation why onto matches that lack rule why (optional enrich). */
export function attachLedgerWhyToMatches<T extends { id: string; why?: string; message?: string }>(
  matches: T[],
  explanations: LedgerExplanation[],
): T[] {
  if (explanations.length === 0) return matches;
  const top = explanations[0];
  return matches.map((m, idx) => {
    if (m.why && m.why.trim().length > 0) return m;
    // Prefer sleep/mood related cards for sleep↔mood explanations
    const msg = (m.message ?? '').toLowerCase();
    const sleepMood =
      top.factorA.includes('sleep') || top.factorB.includes('mood') || top.factorA.includes('mood');
    if (sleepMood && (msg.includes('sleep') || msg.includes('mood') || idx === 0)) {
      return { ...m, why: top.why };
    }
    if (idx === 0) return { ...m, why: top.why };
    return m;
  });
}
