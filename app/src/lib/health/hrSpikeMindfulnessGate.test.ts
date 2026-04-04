import { describe, expect, it } from 'vitest';

import { hrSpikeShouldTriggerMindfulness, HR_SPIKE_AMBIGUITY_BPM_BUFFER } from './hrSpikeMindfulnessGate';
import type { RestingHeartRateTrendSummary } from './heartRateRestingSummary';

const adequate = (partial?: Partial<RestingHeartRateTrendSummary>): RestingHeartRateTrendSummary => ({
  sufficiency: 'adequate',
  recentMedianBpm: 60,
  baselineMedianBpm: 58,
  pctAboveBaseline: 0.02,
  trendLabel: 'stable',
  methodNote: 'test',
  ...partial,
});

const sparse = (): RestingHeartRateTrendSummary => ({
  sufficiency: 'sparse',
  recentMedianBpm: 62,
  baselineMedianBpm: null,
  pctAboveBaseline: null,
  trendLabel: 'insufficient_data',
  methodNote: 'test',
});

describe('hrSpikeShouldTriggerMindfulness', () => {
  it('returns false below threshold', () => {
    expect(hrSpikeShouldTriggerMindfulness(99, 100, adequate())).toBe(false);
  });

  it('fires at threshold when context is adequate and sources are aligned', () => {
    expect(
      hrSpikeShouldTriggerMindfulness(100, 100, adequate(), {
        liveSamplesMisalignedWithRestingContext: false,
      }),
    ).toBe(true);
  });

  it('requires extra BPM when context is sparse', () => {
    const t = 100;
    expect(hrSpikeShouldTriggerMindfulness(100, t, sparse())).toBe(false);
    expect(hrSpikeShouldTriggerMindfulness(100 + HR_SPIKE_AMBIGUITY_BPM_BUFFER, t, sparse())).toBe(true);
  });

  it('requires extra BPM when live HR stream is misaligned with resting context even if adequate', () => {
    const t = 100;
    expect(
      hrSpikeShouldTriggerMindfulness(100, t, adequate(), {
        liveSamplesMisalignedWithRestingContext: true,
      }),
    ).toBe(false);
    expect(
      hrSpikeShouldTriggerMindfulness(100 + HR_SPIKE_AMBIGUITY_BPM_BUFFER, t, adequate(), {
        liveSamplesMisalignedWithRestingContext: true,
      }),
    ).toBe(true);
  });
});
