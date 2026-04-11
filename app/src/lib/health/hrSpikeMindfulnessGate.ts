import type { RestingHeartRateTrendSummary } from './heartRateRestingSummary';

/** Extra BPM above threshold when resting-HR history is too thin (e.g. workout spikes). */
export const HR_SPIKE_AMBIGUITY_BPM_BUFFER = 15;

export type HrSpikeGateOptions = {
  /**
   * Live HR samples come from a different pipeline than resting-HR aggregates
   * (e.g. live HR stream vs daily vitals aggregates). Resting trend must not
   * unlock the lower BPM bar for instantaneous readings.
   */
  liveSamplesMisalignedWithRestingContext?: boolean;
};

/**
 * When a tracker reports high instantaneous HR, only treat resting-HR trend as
 * “unlocking” the base threshold if the trend describes the same signal family
 * as the live samples (see options). Otherwise require threshold + buffer.
 */
export function hrSpikeShouldTriggerMindfulness(
  bpm: number,
  threshold: number,
  summary: RestingHeartRateTrendSummary,
  options?: HrSpikeGateOptions,
): boolean {
  if (!Number.isFinite(bpm) || bpm < threshold) return false;
  const misaligned = options?.liveSamplesMisalignedWithRestingContext === true;
  const canTrustAdequateContext = !misaligned && summary.sufficiency === 'adequate';
  if (canTrustAdequateContext) return true;
  return bpm >= threshold + HR_SPIKE_AMBIGUITY_BPM_BUFFER;
}
