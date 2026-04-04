import type { RestingHeartRateTrendSummary } from './heartRateRestingSummary';

/** Extra BPM above threshold when resting-HR history is too thin (e.g. workout spikes). */
export const HR_SPIKE_AMBIGUITY_BPM_BUFFER = 15;

/**
 * When Google Fit reports a high instantaneous HR, we lack activity context.
 * If resting-HR trend data is sparse, require a higher BPM before nudging mindfulness.
 */
export function hrSpikeShouldTriggerMindfulness(
  bpm: number,
  threshold: number,
  summary: RestingHeartRateTrendSummary,
): boolean {
  if (!Number.isFinite(bpm) || bpm < threshold) return false;
  if (summary.sufficiency === 'adequate') return true;
  return bpm >= threshold + HR_SPIKE_AMBIGUITY_BPM_BUFFER;
}
