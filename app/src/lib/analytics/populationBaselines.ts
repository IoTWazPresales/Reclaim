/**
 * Static, research-sourced reference bands for privacy-first population context (v1).
 * Framed as "typical range" — never rank or percentile-vs-strangers.
 */

export type PopulationBand = {
  typicalLow: number;
  typicalHigh: number;
  source: string;
};

export const populationBaselines = {
  sleepHours: {
    typicalLow: 6.5,
    typicalHigh: 8.5,
    source: 'CDC/NSF guidance',
  },
  /** Day-to-day standard deviation of daily mood averages (1–5 scale). */
  moodVolatility: {
    typicalLow: 0.4,
    typicalHigh: 1.2,
    source: 'typical mood check-in variance',
  },
  adherencePct: {
    typicalLow: 70,
    typicalHigh: 90,
    source: 'common adherence bands',
  },
} as const satisfies Record<string, PopulationBand>;

// TODO(v2): Opt-in, k-anonymous server cohort comparisons (n≥1000 per segment).
// - User explicitly enables "Compare with others" in Settings → Privacy.
// - Server aggregates rolling 7-day metrics with differential privacy noise (ε≈1.0).
// - Only publish band percentiles when cohort size ≥1000; never expose individual ranks.
// - Client shows "similar to others in your age band" using returned noisy quantiles, not raw peer data.
// - No competitive framing; copy stays "typical range" aligned with v1 static bands as fallback.
